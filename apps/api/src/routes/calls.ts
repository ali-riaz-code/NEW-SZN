import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '@new-szn/db'
import type { CallOutcome, ObjectionType, Prisma } from '@new-szn/db'
import {
  aggregateObjections,
  isWonOutcome,
  computeCallKpis,
  goalProgress,
  getLatestRates,
  convertToDisplay,
} from '@new-szn/db/kpi'
import { requireRole } from '../middleware/auth'
import { maybeTriggerLossDebrief } from '../integrations/loss-debrief'
import { maybeCelebrateBigDeal } from '../integrations/slack-milestones'
import { id } from '../lib/validation'
import { mostRecentCallDate, anchorRefDate, dashboardPeriod } from '../lib/period'

// Two routers exported: callsRouter → /api/calls, salesRouter → /api/sales
export const callsRouter = Router()
export const salesRouter = Router()

const OUTCOMES = [
  'CLOSED_PIF',
  'CLOSED_SPLIT_PAY',
  'CLOSED_DEPOSIT',
  'OFFER_DECLINED',
  'NOT_A_FIT',
  'NO_SHOW',
  'CANCELLED',
  'RESCHEDULED',
  'DRAG_OVER_SHOW',
] as const

const OBJECTIONS = ['THINK_ABOUT_IT', 'MONEY', 'TIME', 'PARTNER', 'FEAR', 'VALUE'] as const

function trendPct(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0
  return Math.round(((cur - prev) / prev) * 1000) / 10
}

// Resolve which client a non-admin acts within, or validate an admin's choice.
// Exported so sibling routers (follow-ups) reuse identical scoping semantics.
export async function resolveClientId(
  userId: string,
  role: string,
  requested?: string,
): Promise<string | undefined> {
  if (role === 'ADMIN') {
    if (requested) return requested
    // Default to the active client with the MOST call data, not merely the most
    // recent single call — otherwise a client with one stray recent call wins and
    // the dashboard (and its sparklines) render nearly empty.
    const busiest = await prisma.call.groupBy({
      by: ['clientId'],
      where: { client: { isActive: true }, deletedAt: null },
      _count: { clientId: true },
      orderBy: { _count: { clientId: 'desc' } },
      take: 1,
    })
    if (busiest[0]) return busiest[0].clientId
    const first = await prisma.client.findFirst({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true },
    })
    return first?.id
  }
  const mems = await prisma.membership.findMany({ where: { userId }, select: { clientId: true } })
  const ids = mems.map((m) => m.clientId)
  if (requested && ids.includes(requested)) return requested
  const latest = await prisma.call.findFirst({
    where: { closerId: userId, clientId: { in: ids }, deletedAt: null },
    orderBy: { date: 'desc' },
    select: { clientId: true },
  })
  return latest?.clientId ?? ids[0]
}

// ─── POST /api/calls — log a call ───────────────────────────────────────────────

const logCallSchema = z.object({
  clientId: id,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  leadName: z.string().min(1).max(160),
  leadPhone: z.string().max(40).optional(),
  leadEmail: z.string().email().max(160).optional().or(z.literal('')),
  leadSource: z.string().max(80).optional(),
  outcome: z.enum(OUTCOMES),
  revenueMinor: z.number().int().min(0).default(0),
  cashCollectedMinor: z.number().int().min(0).default(0),
  objectionType: z.enum(OBJECTIONS).optional(),
  objectionNotes: z.string().max(2000).optional(),
  callDurationSecs: z.number().int().min(0).optional(),
  followUpNotes: z.string().max(2000).optional(),
  callSummary: z.string().max(4000).optional(),
  closerId: id.optional(), // admin only — log on behalf of a closer
})

callsRouter.post('/', requireRole(['CLOSER', 'ADMIN']), async (req, res, next) => {
  try {
    const parsed = logCallSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const { userId, role } = req.user!
    const d = parsed.data

    // Closers can only log their own calls; admins may specify closerId.
    const closerId = role === 'ADMIN' ? (d.closerId ?? userId) : userId

    // Membership check (non-admins)
    if (role !== 'ADMIN') {
      const mem = await prisma.membership.findUnique({
        where: { userId_clientId: { userId: closerId, clientId: d.clientId } },
        select: { id: true },
      })
      if (!mem) return res.status(403).json({ error: 'Not a member of this client.' })
    }

    const client = await prisma.client.findUnique({
      where: { id: d.clientId },
      select: { currency: true },
    })
    if (!client) return res.status(404).json({ error: 'Client not found.' })

    const call = await prisma.call.create({
      data: {
        clientId: d.clientId,
        closerId,
        date: new Date(`${d.date}T12:00:00`),
        leadName: d.leadName,
        leadPhone: d.leadPhone || null,
        leadEmail: d.leadEmail || null,
        leadSource: d.leadSource || null,
        outcome: d.outcome as CallOutcome,
        revenueMinor: d.revenueMinor,
        cashCollectedMinor: d.cashCollectedMinor,
        currency: client.currency,
        objectionType: (d.objectionType as ObjectionType) ?? null,
        objectionNotes: d.objectionNotes || null,
        callDurationSecs: d.callDurationSecs ?? null,
        followUpNotes: d.followUpNotes || null,
        callSummary: d.callSummary || null,
      },
      select: { id: true, outcome: true },
    })

    // Auto-trigger Loss Debrief for lost calls (fire-and-forget — never blocks).
    maybeTriggerLossDebrief(call.id)
    // Celebrate big deals in Slack (fire-and-forget — no-ops below the threshold).
    maybeCelebrateBigDeal(call.id)

    return res.status(201).json({ id: call.id })
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/calls — paginated, filtered call log ──────────────────────────────

const listSchema = z.object({
  clientId: id.optional(),
  outcome: z.enum(OUTCOMES).optional(),
  closerId: id.optional(),
  leadName: z.string().max(160).optional(),
  leadSource: z.string().max(80).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // Admin-only: include soft-deleted calls in the results (audit/recovery view).
  includeDeleted: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})

callsRouter.get('/', requireRole(['ADMIN', 'CLOSER']), async (req, res, next) => {
  try {
    const parsed = listSchema.safeParse(req.query)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const { userId, role } = req.user!
    const q = parsed.data

    // Admin with no explicit clientId: show all active clients so the full
    // call log is searchable across the entire agency portfolio.
    let clientFilter: Prisma.CallWhereInput
    if (role === 'ADMIN' && !q.clientId) {
      const activeClients = await prisma.client.findMany({
        where: { isActive: true },
        select: { id: true },
      })
      if (activeClients.length === 0)
        return res.json({ rows: [], total: 0, page: q.page, pageSize: q.pageSize })
      clientFilter = { clientId: { in: activeClients.map((c) => c.id) } }
    } else {
      const clientId = await resolveClientId(userId, role, q.clientId)
      if (!clientId) return res.json({ rows: [], total: 0, page: q.page, pageSize: q.pageSize })
      clientFilter = { clientId }
    }

    const where: Prisma.CallWhereInput = { ...clientFilter }
    if (role === 'CLOSER') where.closerId = userId
    else if (q.closerId) where.closerId = q.closerId
    if (q.outcome) where.outcome = q.outcome as CallOutcome
    if (q.leadName) where.leadName = { contains: q.leadName, mode: 'insensitive' }
    if (q.leadSource) where.leadSource = { contains: q.leadSource, mode: 'insensitive' }
    // Exclude soft-deleted by default; only admins may opt to include them.
    if (!(role === 'ADMIN' && q.includeDeleted)) where.deletedAt = null
    if (q.from || q.to) {
      const dateFilter: { gte?: Date; lte?: Date } = {}
      if (q.from) dateFilter.gte = new Date(`${q.from}T00:00:00`)
      if (q.to) dateFilter.lte = new Date(`${q.to}T23:59:59.999`)
      where.date = dateFilter
    }

    const [total, rows, rates] = await Promise.all([
      prisma.call.count({ where }),
      prisma.call.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        select: {
          id: true,
          date: true,
          leadName: true,
          leadSource: true,
          outcome: true,
          revenueMinor: true,
          cashCollectedMinor: true,
          currency: true,
          objectionType: true,
          deletedAt: true,
          closer: { select: { id: true, name: true } },
          leadTags: { orderBy: { createdAt: 'desc' }, take: 1, select: { tagType: true } },
        },
      }),
      getLatestRates('USD'),
    ])

    const toUsdMinorFor = (amt: number, from: string) =>
      Math.round(convertToDisplay(amt, from, 'USD', rates) * 100)

    return res.json({
      rows: rows.map((r) => ({
        id: r.id,
        date: r.date.toISOString().slice(0, 10),
        leadName: r.leadName,
        leadSource: r.leadSource,
        outcome: r.outcome,
        revenueMinor: toUsdMinorFor(r.revenueMinor, r.currency),
        cashCollectedMinor: toUsdMinorFor(r.cashCollectedMinor, r.currency),
        currency: 'USD',
        objectionType: r.objectionType,
        closerName: r.closer.name,
        closerId: r.closer.id,
        currentTag: r.leadTags[0]?.tagType ?? null,
        deleted: r.deletedAt != null,
      })),
      total,
      page: q.page,
      pageSize: q.pageSize,
    })
  } catch (error) {
    next(error)
  }
})

// ─── Lead tagging (append-only) + soft delete + reassignment ─────────────────────

const TAG_TYPES = [
  'CLOSED',
  'FOLLOW_UP',
  'HOT_FOLLOW_UP',
  'NO_SHOW',
  'DECLINED',
  'NOT_INTERESTED',
  'RESCHEDULED',
] as const

// Load a call for a mutating action, enforcing closer ownership (data-scoping,
// not a role check — role gating stays in requireRole). Returns null if the
// call doesn't exist or the caller (closer) doesn't own it.
async function loadOwnedCall(callId: string, userId: string, role: string) {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    select: { id: true, closerId: true, clientId: true, deletedAt: true },
  })
  if (!call) return null
  if (role === 'CLOSER' && call.closerId !== userId) return null
  return call
}

const tagBodySchema = z.object({ tagType: z.enum(TAG_TYPES) })

// POST /api/calls/:id/tags — append a lead tag (never overwrites; full history
// preserved per Locked Decision #2). Admin: any call. Closer: own calls only.
callsRouter.post('/:id/tags', requireRole(['ADMIN', 'CLOSER']), async (req, res, next) => {
  try {
    const cid = id.safeParse(req.params.id)
    if (!cid.success) return res.status(400).json({ error: cid.error.flatten() })
    const parsed = tagBodySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const { userId, role } = req.user!

    const call = await loadOwnedCall(cid.data, userId, role)
    if (!call) return res.status(404).json({ error: 'Call not found.' })

    const tag = await prisma.leadTag.create({
      data: { callId: call.id, tagType: parsed.data.tagType, taggedBy: userId },
      select: { id: true, tagType: true, createdAt: true },
    })
    return res.status(201).json({ id: tag.id, tagType: tag.tagType, createdAt: tag.createdAt })
  } catch (error) {
    next(error)
  }
})

// GET /api/calls/:id/tags — full tag history (most recent first).
callsRouter.get('/:id/tags', requireRole(['ADMIN', 'CLOSER']), async (req, res, next) => {
  try {
    const cid = id.safeParse(req.params.id)
    if (!cid.success) return res.status(400).json({ error: cid.error.flatten() })
    const { userId, role } = req.user!

    const call = await loadOwnedCall(cid.data, userId, role)
    if (!call) return res.status(404).json({ error: 'Call not found.' })

    const history = await prisma.leadTag.findMany({
      where: { callId: call.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, tagType: true, createdAt: true, tagger: { select: { name: true } } },
    })
    return res.json({
      history: history.map((h) => ({
        id: h.id,
        tagType: h.tagType,
        taggedByName: h.tagger.name,
        createdAt: h.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/calls/:id — soft delete (admin only). Sets deletedAt; never removes
// the row (Commission/LeadTag/PnL may reference it). Recoverable via /restore.
callsRouter.delete('/:id', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const cid = id.safeParse(req.params.id)
    if (!cid.success) return res.status(400).json({ error: cid.error.flatten() })
    const call = await prisma.call.findUnique({ where: { id: cid.data }, select: { id: true, deletedAt: true } })
    if (!call) return res.status(404).json({ error: 'Call not found.' })
    if (call.deletedAt) return res.json({ ok: true, alreadyDeleted: true })
    await prisma.call.update({ where: { id: cid.data }, data: { deletedAt: new Date() } })
    return res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

// POST /api/calls/:id/restore — undo a soft delete (admin only).
callsRouter.post('/:id/restore', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const cid = id.safeParse(req.params.id)
    if (!cid.success) return res.status(400).json({ error: cid.error.flatten() })
    const call = await prisma.call.findUnique({ where: { id: cid.data }, select: { id: true } })
    if (!call) return res.status(404).json({ error: 'Call not found.' })
    await prisma.call.update({ where: { id: cid.data }, data: { deletedAt: null } })
    return res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

const reassignSchema = z.object({ closerId: id })

// PATCH /api/calls/:id/reassign — move a lead to a different closer (admin only).
callsRouter.patch('/:id/reassign', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const cid = id.safeParse(req.params.id)
    if (!cid.success) return res.status(400).json({ error: cid.error.flatten() })
    const parsed = reassignSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const call = await prisma.call.findUnique({ where: { id: cid.data }, select: { clientId: true } })
    if (!call) return res.status(404).json({ error: 'Call not found.' })

    // The new closer must be a member of the call's client.
    const target = await prisma.user.findUnique({
      where: { id: parsed.data.closerId },
      select: { role: true, memberships: { where: { clientId: call.clientId }, select: { id: true } } },
    })
    if (!target) return res.status(404).json({ error: 'Target closer not found.' })
    if (target.role !== 'CLOSER' && target.role !== 'ADMIN') {
      return res.status(400).json({ error: 'Target user is not a closer.' })
    }
    if (target.memberships.length === 0) {
      return res.status(400).json({ error: 'Target closer is not a member of this client.' })
    }

    await prisma.call.update({ where: { id: cid.data }, data: { closerId: parsed.data.closerId } })
    return res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/sales/metrics — Sales & Closing dashboard payload ──────────────────

const metricsSchema = z.object({ clientId: id.optional() })

salesRouter.get('/metrics', requireRole(['ADMIN', 'CLOSER']), async (req, res, next) => {
  try {
    const parsed = metricsSchema.safeParse(req.query)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const { userId, role } = req.user!

    const clientId = await resolveClientId(userId, role, parsed.data.clientId)
    if (!clientId) return res.json({ empty: true })

    // Anchor the reporting window on the client's most recent call so the
    // dashboard shows real data even when the current month is empty.
    const now = new Date()
    const refDate = anchorRefDate(await mostRecentCallDate(clientId), now)
    const { curStart, curEnd, prevStart, prevEnd, curDays, curElapsed, month, year } =
      dashboardPeriod(refDate, now)

    const callScope = role === 'CLOSER' ? { closerId: userId } : {}

    // Start of today for the accountability lock check.
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)

    const [client, curCalls, prevCalls, goals, todayCount, recent, closerMemberships] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId }, select: { currency: true, name: true } }),
      prisma.call.findMany({
        where: { clientId, ...callScope, deletedAt: null, date: { gte: curStart, lte: curEnd } },
        select: {
          date: true,
          outcome: true,
          revenueMinor: true,
          cashCollectedMinor: true,
          objectionType: true,
          closerId: true,
          closer: { select: { name: true } },
        },
      }),
      prisma.call.findMany({
        where: { clientId, ...callScope, deletedAt: null, date: { gte: prevStart, lte: prevEnd } },
        select: { outcome: true, revenueMinor: true, cashCollectedMinor: true },
      }),
      prisma.goal.findMany({
        where: {
          clientId,
          month,
          year,
          kpiKey: { in: ['revenue', 'cashCollected', 'dealsWon', 'callsTaken', 'closeRate', 'showUpRate'] },
        },
        select: { kpiKey: true, targetMinor: true, targetValue: true, greenPct: true, amberPct: true },
      }),
      prisma.call.count({ where: { clientId, closerId: userId, deletedAt: null, date: { gte: todayStart } } }),
      // Today's calls only — powers the "Today's Call Log" table with full detail fields.
      prisma.call.findMany({
        where: { clientId, ...callScope, deletedAt: null, date: { gte: todayStart } },
        orderBy: { date: 'desc' },
        select: {
          id: true,
          date: true,
          leadName: true,
          leadPhone: true,
          leadEmail: true,
          outcome: true,
          revenueMinor: true,
          currency: true,
          objectionType: true,
          objectionNotes: true,
          callSummary: true,
          closer: { select: { id: true, name: true } },
          leadTags: { orderBy: { createdAt: 'desc' }, take: 1, select: { tagType: true } },
        },
      }),
      // Closer roster for the client — lets admin reassign leads from the table.
      prisma.membership.findMany({
        where: { clientId, user: { role: 'CLOSER' } },
        select: { user: { select: { id: true, name: true } } },
      }),
    ])

    // All dashboards display in USD — convert from the client's native currency.
    const clientCurrency = client?.currency ?? 'USD'
    const rates = clientCurrency !== 'USD' ? await getLatestRates('USD') : {}
    const toUsdMinor = (amt: number) =>
      Math.round(convertToDisplay(amt, clientCurrency, 'USD', rates) * 100)
    const currency = 'USD'
    const clientName = client?.name ?? clientId

    // Normalize call amounts to USD so all KPIs and sparklines are single-currency.
    const curCallsUsd = curCalls.map((c) => ({
      ...c,
      revenueMinor: toUsdMinor(c.revenueMinor),
      cashCollectedMinor: toUsdMinor(c.cashCollectedMinor),
    }))
    const prevCallsUsd = prevCalls.map((c) => ({
      ...c,
      revenueMinor: toUsdMinor(c.revenueMinor),
      cashCollectedMinor: toUsdMinor(c.cashCollectedMinor),
    }))

    // Outcome breakdown (fine-grained, for pie chart)
    const breakdown = Object.fromEntries(OUTCOMES.map((o) => [o, 0])) as Record<(typeof OUTCOMES)[number], number>
    for (const c of curCallsUsd) breakdown[c.outcome] += 1

    // Single source of truth — identical won-only formulas as every other dashboard.
    // Deposit-only / showed-but-didn't-close never leak into revenue, deals won, or
    // close rate (they land in dealsLost + the Deposits card). See computeCallKpis.
    const cur = computeCallKpis(curCallsUsd)
    const prev = computeCallKpis(prevCallsUsd)

    const dealsWon = cur.dealsWon
    const dealsLost = cur.dealsLost // Offer Declined + Not a Fit + Deposit + Drag-over
    const depositCount = cur.deposits
    const depositEstValueMinor = cur.avgDealMinor * depositCount

    const elapsed = curElapsed

    function getGoal(kpiKey: string, actual: number, isMinor: boolean) {
      const g = goals.find((row) => row.kpiKey === kpiKey)
      if (!g) return undefined
      const target = isMinor ? toUsdMinor(g.targetMinor ?? 0) : Number(g.targetValue ?? 0)
      if (target === 0) return undefined
      const { pct, band } = goalProgress(actual, target, g.greenPct, g.amberPct)
      return { pct: Math.round(pct), band }
    }

    // Daily cumulative revenue trend (won-deal revenue only, per spec; amounts in USD)
    const revByDay = new Array<number>(curDays).fill(0)
    for (const c of curCallsUsd) {
      if (!isWonOutcome(c.outcome)) continue
      const idx = new Date(c.date).getDate() - 1
      if (idx >= 0 && idx < curDays) revByDay[idx] = (revByDay[idx] ?? 0) + c.revenueMinor
    }
    let cum = 0
    const revenueTrend: Array<{ day: number; cumulativeRevenue: number }> = []
    for (let i = 0; i < elapsed; i++) {
      cum += revByDay[i] ?? 0
      revenueTrend.push({ day: i + 1, cumulativeRevenue: cum })
    }

    // Daily sparkline arrays (one entry per day of the current period up to today; amounts in USD)
    const cashByDay = new Array<number>(curDays).fill(0)
    const dealsByDay = new Array<number>(curDays).fill(0)
    const callsByDay = new Array<number>(curDays).fill(0)
    const depositsByDay = new Array<number>(curDays).fill(0)
    for (const c of curCallsUsd) {
      const idx = new Date(c.date).getDate() - 1
      if (idx < 0 || idx >= curDays) continue
      if (isWonOutcome(c.outcome)) {
        cashByDay[idx] = (cashByDay[idx] ?? 0) + c.cashCollectedMinor
        dealsByDay[idx] = (dealsByDay[idx] ?? 0) + 1
      }
      if (c.outcome !== 'RESCHEDULED') callsByDay[idx] = (callsByDay[idx] ?? 0) + 1
      if (c.outcome === 'CLOSED_DEPOSIT') depositsByDay[idx] = (depositsByDay[idx] ?? 0) + 1
    }
    // Cumulative close rate sparkline (running MTD rate, not per-day noise)
    let cumClosedSpark = 0
    let cumConductedSpark = 0
    const closeRateSpark: number[] = []
    for (let i = 0; i < elapsed; i++) {
      cumClosedSpark += dealsByDay[i] ?? 0
      cumConductedSpark += callsByDay[i] ?? 0
      closeRateSpark.push(cumConductedSpark > 0 ? (cumClosedSpark / cumConductedSpark) * 100 : 0)
    }
    const revSpark = revByDay.slice(0, elapsed)
    const cashSpark = cashByDay.slice(0, elapsed)
    const dealsSpark = dealsByDay.slice(0, elapsed)
    const callsSpark = callsByDay.slice(0, elapsed)
    const depositsSpark = depositsByDay.slice(0, elapsed)

    // Objection counters
    const objCounts = aggregateObjections(curCalls.map((c) => c.objectionType))

    // Accountability lock — closers see a blurred dashboard until they log a call today.
    // This is intentional accountability UX (see CLAUDE.md) — not a bug.
    const accountabilityLock = { locked: role === 'CLOSER' && todayCount === 0 }

    return res.json({
      currency,
      clientId,
      clientName,
      period: {
        month,
        year,
        label: refDate.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      },
      accountabilityLock,
      kpis: {
        revenue:       { value: cur.revenueMinor, currency, trendPct: trendPct(cur.revenueMinor, prev.revenueMinor), goal: getGoal('revenue', cur.revenueMinor, true),    sparkline: revSpark },
        cashCollected: { value: cur.cashMinor,    currency, trendPct: trendPct(cur.cashMinor, prev.cashMinor),        goal: getGoal('cashCollected', cur.cashMinor, true), sparkline: cashSpark },
        dealsWonLost:  { won: dealsWon, lost: dealsLost, trendPct: trendPct(dealsWon, prev.dealsWon),                 goal: getGoal('dealsWon', dealsWon, false),          sparkline: dealsSpark },
        closeRate:     { value: Math.round(cur.closeRatePct * 10) / 10, trendPct: trendPct(cur.closeRatePct, prev.closeRatePct), goal: getGoal('closeRate', cur.closeRatePct, false),   sparkline: closeRateSpark },
        showUpRate:    { value: Math.round(cur.showUpRatePct * 10) / 10, trendPct: trendPct(cur.showUpRatePct, prev.showUpRatePct), goal: getGoal('showUpRate', cur.showUpRatePct, false), sparkline: callsSpark },
        deposits:      { count: depositCount, estValueMinor: depositEstValueMinor, currency,                                                                   sparkline: depositsSpark },
        revenuePerCall: { value: cur.revenuePerCallMinor, currency, trendPct: 0,                                                                               sparkline: revSpark },
        cashPerCall:   { value: cur.cashPerCallMinor, currency, trendPct: 0,                                                                                   sparkline: cashSpark },
        cashUpfrontPct: { value: cur.cashUpfrontPct,     trendPct: 0,                                                                                          sparkline: cashSpark },
        pifPct:        { value: cur.pifPct,              trendPct: 0,                                                                                          sparkline: dealsSpark },
        avgDeal:       { value: cur.avgDealMinor, currency, trendPct: 0,                                                                                       sparkline: revSpark },
        avgCash:       { value: cur.avgCashMinor, currency, trendPct: 0,                                                                                       sparkline: cashSpark },
      },
      objections: OBJECTIONS.map((o) => ({ type: o, count: objCounts[o] })),
      outcomeBreakdown: OUTCOMES.map((o) => ({ outcome: o, count: breakdown[o] })),
      revenueTrend,
      recentCalls: recent.map((r) => ({
        id: r.id,
        date: r.date.toISOString().slice(0, 10),
        leadName: r.leadName,
        leadPhone: r.leadPhone,
        leadEmail: r.leadEmail,
        outcome: r.outcome,
        revenueMinor: toUsdMinor(r.revenueMinor),
        currency: 'USD',
        objectionType: r.objectionType,
        objectionNotes: r.objectionNotes,
        callSummary: r.callSummary,
        closerName: r.closer.name,
        closerId: r.closer.id,
        currentTag: r.leadTags[0]?.tagType ?? null,
      })),
      closers: closerMemberships.map((m) => ({ id: m.user.id, name: m.user.name })),
    })
  } catch (error) {
    next(error)
  }
})
