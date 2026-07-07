// Settings panel API (Phase 11) — admin only.
//
// Surfaces the config that the dashboards/AI/Slack/anomaly layers read from the
// DB: users, clients, monthly goals (thresholds always live in the Goal rows),
// Meta ad-account linking, the single global Slack config, per-client anomaly
// thresholds, and agency-wide per-dashboard AI personality (AiConfig).
//
// Role enforcement is via requireRole(['ADMIN']) — never re-checked in handlers
// (Locked Decision #9). User invites remain at POST /api/admin/users/invite;
// this router owns listing/editing everything else.

import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '@new-szn/db'
import type { Role } from '@new-szn/db'
import { requireRole } from '../middleware/auth'
import { id } from '../lib/validation'
import { SLACK_SETTINGS_ID } from '../integrations/slack'

const router = Router()
router.use(requireRole(['ADMIN']))

const ROLES = ['ADMIN', 'CLOSER', 'SETTER', 'CLIENT'] as const
const DASHBOARDS = ['master', 'sales', 'ads', 'setter'] as const

// KPIs that can carry a monthly goal. Money KPIs use targetMinor; the rest
// use targetValue (counts + rates/percentages + ROAS multiple).
const MONEY_KPIS = ['revenue', 'cashCollected'] as const
const VALUE_KPIS = ['dealsWon', 'callsTaken', 'bookedCalls', 'closeRate', 'showUpRate', 'roas'] as const
const KPI_KEYS = [...MONEY_KPIS, ...VALUE_KPIS] as const

function bad(res: import('express').Response, err: z.ZodError) {
  return res.status(400).json({ error: err.flatten() })
}

// ─── Users ──────────────────────────────────────────────────────────────────────

// GET /api/settings/users — every user + their client memberships.
router.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        slackUserId: true,
        memberships: { select: { clientId: true } },
      },
    })
    res.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        slackUserId: u.slackUserId,
        clientIds: u.memberships.map((m) => m.clientId),
      })),
    })
  } catch (e) {
    next(e)
  }
})

const userPatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
  slackUserId: z
    .union([
      z.literal(null),
      z.string().min(1).regex(/^[UWB][A-Z0-9]+$/, 'Slack ID must start with U, W, or B followed by uppercase letters and numbers').max(40),
    ])
    .nullable()
    .optional(),
  clientIds: z.array(id).optional(), // full replacement of memberships when present
})

// PATCH /api/settings/users/:id — edit role/active/slack/name and (optionally)
// replace the user's client memberships wholesale.
router.patch('/users/:id', async (req, res, next) => {
  try {
    const uid = id.safeParse(req.params.id)
    if (!uid.success) return bad(res, uid.error)
    const parsed = userPatchSchema.safeParse(req.body)
    if (!parsed.success) return bad(res, parsed.error)
    const d = parsed.data

    const existing = await prisma.user.findUnique({ where: { id: uid.data }, select: { id: true } })
    if (!existing) return res.status(404).json({ error: 'User not found.' })

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: uid.data },
        data: {
          ...(d.name !== undefined ? { name: d.name } : {}),
          ...(d.role !== undefined ? { role: d.role as Role } : {}),
          ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
          ...(d.slackUserId !== undefined ? { slackUserId: d.slackUserId || null } : {}),
        },
      })
      if (d.clientIds) {
        await tx.membership.deleteMany({ where: { userId: uid.data } })
        if (d.clientIds.length > 0) {
          await tx.membership.createMany({
            data: d.clientIds.map((clientId) => ({ userId: uid.data, clientId })),
            skipDuplicates: true,
          })
        }
      }
    })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

// DELETE /api/settings/users/:id — permanently remove a user who has never
// logged any activity. Users with real history (calls, setter logs, lead
// tags, generated reports) can't be hard-deleted — deactivate them instead
// so their name stays attached to the historical records they created.
router.delete('/users/:id', async (req, res, next) => {
  try {
    const uid = id.safeParse(req.params.id)
    if (!uid.success) return bad(res, uid.error)

    const existing = await prisma.user.findUnique({ where: { id: uid.data }, select: { id: true } })
    if (!existing) return res.status(404).json({ error: 'User not found.' })

    const [callCount, setterLogCount, leadTagCount, reportCount] = await Promise.all([
      prisma.call.count({ where: { closerId: uid.data } }),
      prisma.setterLog.count({ where: { setterId: uid.data } }),
      prisma.leadTag.count({ where: { taggedBy: uid.data } }),
      prisma.report.count({ where: { generatedBy: uid.data } }),
    ])
    if (callCount + setterLogCount + leadTagCount + reportCount > 0) {
      return res.status(409).json({
        error: 'This user has logged activity and can’t be permanently removed. Deactivate them instead to preserve historical data.',
      })
    }

    await prisma.$transaction([
      prisma.membership.deleteMany({ where: { userId: uid.data } }),
      prisma.user.delete({ where: { id: uid.data } }),
    ])
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

// ─── Clients ──────────────────────────────────────────────────────────────────

// GET /api/settings/clients — all clients (active + archived) with config summary.
router.get('/clients', async (_req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        currency: true,
        timezone: true,
        isActive: true,
        metaAdAccountId: true,
        anomalyWarningPct: true,
        anomalyCriticalPct: true,
        closeRateAnomalyWarningPct: true,
        closeRateAnomalyCriticalPct: true,
        bigDealThresholdMinor: true,
      },
    })
    res.json({ clients })
  } catch (e) {
    next(e)
  }
})

const clientCreateSchema = z.object({
  name: z.string().min(1).max(160),
  currency: z.string().length(3).default('DKK'),
  timezone: z.string().max(60).default('Europe/Copenhagen'),
  metaAdAccountId: z.string().max(60).nullable().optional(),
})

// POST /api/settings/clients — create a client.
router.post('/clients', async (req, res, next) => {
  try {
    const parsed = clientCreateSchema.safeParse(req.body)
    if (!parsed.success) return bad(res, parsed.error)
    const d = parsed.data
    const client = await prisma.client.create({
      data: {
        name: d.name,
        currency: d.currency.toUpperCase(),
        timezone: d.timezone,
        metaAdAccountId: d.metaAdAccountId || null,
      },
      select: { id: true },
    })
    res.status(201).json({ id: client.id })
  } catch (e) {
    next(e)
  }
})

const clientPatchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().max(60).optional(),
  isActive: z.boolean().optional(), // archive/activate
  metaAdAccountId: z.string().max(60).nullable().optional(), // ad-account linking
  anomalyWarningPct: z.number().int().min(1).max(99).optional(),
  anomalyCriticalPct: z.number().int().min(1).max(99).optional(),
  closeRateAnomalyWarningPct: z.number().int().min(1).max(99).optional(),
  closeRateAnomalyCriticalPct: z.number().int().min(1).max(99).optional(),
  bigDealThresholdMinor: z.number().int().min(0).optional(),
})

// PATCH /api/settings/clients/:id — edit client, archive/activate, link ad account,
// set anomaly thresholds.
router.patch('/clients/:id', async (req, res, next) => {
  try {
    const cid = id.safeParse(req.params.id)
    if (!cid.success) return bad(res, cid.error)
    const parsed = clientPatchSchema.safeParse(req.body)
    if (!parsed.success) return bad(res, parsed.error)
    const d = parsed.data

    // Guard: critical threshold should be >= warning threshold to stay meaningful.
    if (
      d.anomalyWarningPct !== undefined &&
      d.anomalyCriticalPct !== undefined &&
      d.anomalyCriticalPct < d.anomalyWarningPct
    ) {
      return res.status(400).json({ error: 'Critical % must be >= warning %.' })
    }
    if (
      d.closeRateAnomalyWarningPct !== undefined &&
      d.closeRateAnomalyCriticalPct !== undefined &&
      d.closeRateAnomalyCriticalPct < d.closeRateAnomalyWarningPct
    ) {
      return res.status(400).json({ error: 'Close rate critical % must be >= close rate warning %.' })
    }

    const existing = await prisma.client.findUnique({ where: { id: cid.data }, select: { id: true } })
    if (!existing) return res.status(404).json({ error: 'Client not found.' })

    await prisma.client.update({
      where: { id: cid.data },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.currency !== undefined ? { currency: d.currency.toUpperCase() } : {}),
        ...(d.timezone !== undefined ? { timezone: d.timezone } : {}),
        ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
        ...(d.metaAdAccountId !== undefined ? { metaAdAccountId: d.metaAdAccountId || null } : {}),
        ...(d.anomalyWarningPct !== undefined ? { anomalyWarningPct: d.anomalyWarningPct } : {}),
        ...(d.anomalyCriticalPct !== undefined ? { anomalyCriticalPct: d.anomalyCriticalPct } : {}),
        ...(d.closeRateAnomalyWarningPct !== undefined
          ? { closeRateAnomalyWarningPct: d.closeRateAnomalyWarningPct }
          : {}),
        ...(d.closeRateAnomalyCriticalPct !== undefined
          ? { closeRateAnomalyCriticalPct: d.closeRateAnomalyCriticalPct }
          : {}),
        ...(d.bigDealThresholdMinor !== undefined ? { bigDealThresholdMinor: d.bigDealThresholdMinor } : {}),
      },
    })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

// ─── Goals (monthly, per KPI) ────────────────────────────────────────────────────

const goalsQuerySchema = z.object({
  clientId: id,
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
})

// GET /api/settings/goals?clientId&month&year — goals for a client+month.
router.get('/goals', async (req, res, next) => {
  try {
    const parsed = goalsQuerySchema.safeParse(req.query)
    if (!parsed.success) return bad(res, parsed.error)
    const { clientId, month, year } = parsed.data
    const goals = await prisma.goal.findMany({
      where: { clientId, month, year },
      select: {
        kpiKey: true,
        targetMinor: true,
        targetValue: true,
        currency: true,
        greenPct: true,
        amberPct: true,
      },
    })
    res.json({
      goals: goals.map((g) => ({
        kpiKey: g.kpiKey,
        targetMinor: g.targetMinor,
        targetValue: g.targetValue != null ? Number(g.targetValue) : null,
        currency: g.currency,
        greenPct: g.greenPct,
        amberPct: g.amberPct,
      })),
    })
  } catch (e) {
    next(e)
  }
})

const goalUpsertSchema = z
  .object({
    clientId: id,
    kpiKey: z.enum(KPI_KEYS),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
    targetMinor: z.number().int().min(0).nullable().optional(),
    targetValue: z.number().min(0).nullable().optional(),
    // Thresholds are per-goal, admin-configurable, never hardcoded (Locked #1).
    greenPct: z.number().int().min(1).max(100).default(75),
    amberPct: z.number().int().min(1).max(100).default(50),
  })
  .refine((v) => v.amberPct <= v.greenPct, {
    message: 'amberPct must be <= greenPct',
    path: ['amberPct'],
  })

// PUT /api/settings/goals — upsert one KPI goal (target + thresholds).
router.put('/goals', async (req, res, next) => {
  try {
    const parsed = goalUpsertSchema.safeParse(req.body)
    if (!parsed.success) return bad(res, parsed.error)
    const d = parsed.data
    const isMoney = (MONEY_KPIS as readonly string[]).includes(d.kpiKey)

    const client = await prisma.client.findUnique({
      where: { id: d.clientId },
      select: { currency: true },
    })
    if (!client) return res.status(404).json({ error: 'Client not found.' })

    // Money KPIs store targetMinor (+ currency); the rest store targetValue.
    const targetMinor = isMoney ? d.targetMinor ?? null : null
    const targetValue = isMoney ? null : d.targetValue ?? null
    const currency = isMoney ? client.currency : null

    await prisma.goal.upsert({
      where: { clientId_kpiKey_month_year: { clientId: d.clientId, kpiKey: d.kpiKey, month: d.month, year: d.year } },
      update: { targetMinor, targetValue, currency, greenPct: d.greenPct, amberPct: d.amberPct },
      create: {
        clientId: d.clientId,
        kpiKey: d.kpiKey,
        month: d.month,
        year: d.year,
        targetMinor,
        targetValue,
        currency,
        greenPct: d.greenPct,
        amberPct: d.amberPct,
      },
    })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

// ─── Slack config (global — one bot, one overall channel, app-wide) ────────────
//
// The bot token itself is never stored in the DB or exposed here — it's the
// SLACK_BOT_TOKEN env var, set at the infra level. This endpoint only surfaces
// whether that env var is present (for the read-only connection indicator) plus
// the one overall channel id and the global per-message-type toggles.

// GET /api/settings/slack — the single global Slack settings row (or defaults).
router.get('/slack', async (_req, res, next) => {
  try {
    const config = await prisma.slackSettings.findUnique({ where: { id: SLACK_SETTINGS_ID } })
    res.json({ config, botConnected: Boolean(process.env.SLACK_BOT_TOKEN) })
  } catch (e) {
    next(e)
  }
})

const slackUpsertSchema = z.object({
  overallChannelId: z.string().max(40).nullable().optional(),
  leaderboardEnabled: z.boolean().optional(),
  milestoneEnabled: z.boolean().optional(),
  streakMilestoneEnabled: z.boolean().optional(),
  bigDealEnabled: z.boolean().optional(),
  lossDebriefEnabled: z.boolean().optional(),
  alertsEnabled: z.boolean().optional(),
  dailyTargetsEnabled: z.boolean().optional(),
})

// PUT /api/settings/slack — create or update the single global SlackSettings row.
router.put('/slack', async (req, res, next) => {
  try {
    const parsed = slackUpsertSchema.safeParse(req.body)
    if (!parsed.success) return bad(res, parsed.error)
    const { overallChannelId, ...toggles } = parsed.data

    const fields: Record<string, unknown> = { ...toggles }
    if (overallChannelId !== undefined) {
      fields.overallChannelId = overallChannelId?.trim() === '' ? null : overallChannelId
    }

    await prisma.slackSettings.upsert({
      where: { id: SLACK_SETTINGS_ID },
      update: fields,
      create: { id: SLACK_SETTINGS_ID, ...fields },
    })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

// ─── AI personality (agency-wide, per dashboard) ─────────────────────────────────

// GET /api/settings/ai-config — tones for each dashboard (0–4 rows).
router.get('/ai-config', async (_req, res, next) => {
  try {
    const rows = await prisma.aiConfig.findMany({
      select: { dashboard: true, tone: true },
    })
    res.json({ configs: rows })
  } catch (e) {
    next(e)
  }
})

const aiUpsertSchema = z.object({
  dashboard: z.enum(DASHBOARDS),
  tone: z.string().max(500), // empty string = clear (handled below)
})

// PUT /api/settings/ai-config — set (or clear) the tone for a dashboard.
router.put('/ai-config', async (req, res, next) => {
  try {
    const parsed = aiUpsertSchema.safeParse(req.body)
    if (!parsed.success) return bad(res, parsed.error)
    const { dashboard, tone } = parsed.data
    const trimmed = tone.trim()

    if (trimmed === '') {
      // Empty tone = revert to default voice: remove any existing row.
      await prisma.aiConfig.deleteMany({ where: { dashboard } })
      return res.json({ ok: true, cleared: true })
    }

    await prisma.aiConfig.upsert({
      where: { dashboard },
      update: { tone: trimmed },
      create: { dashboard, tone: trimmed },
    })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
