import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '@new-szn/db'
import { CallOutcome } from '@new-szn/db'
import { isWonOutcome, getLatestRates, convertToDisplay } from '@new-szn/db/kpi'
import { requireRole } from '../middleware/auth'
import { syncAdCampaigns } from '../integrations/facebook'
import { generateCampaignNarrative } from '../integrations/campaign-narrative'
import { id } from '../lib/validation'
import { mostRecentAdDate, anchorRefDate, dashboardPeriod } from '../lib/period'

const router = Router()

// Manual-sync cooldown (docs: 15 minutes). Do not bypass without flagging (CLAUDE.md).
export const SYNC_COOLDOWN_MS = 15 * 60 * 1000

function trendPct(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0
  return Math.round(((cur - prev) / prev) * 1000) / 10
}

// Resolve the ad-account client for the caller.
async function resolveClientId(userId: string, role: string, requested?: string): Promise<string | undefined> {
  if (role === 'ADMIN') {
    if (requested) return requested
    const withAcct = await prisma.client.findFirst({
      where: { isActive: true, metaAdAccountId: { not: null } },
      orderBy: { name: 'asc' },
      select: { id: true },
    })
    if (withAcct) return withAcct.id
    // No connected ad account (e.g. demo data): default to the active client with
    // the most ad-metric history so the Ads dashboard renders real numbers + trends
    // instead of landing on an alphabetically-first client that has no ad data.
    const busiestAds = await prisma.adDailyMetric.groupBy({
      by: ['clientId'],
      where: { client: { isActive: true } },
      _count: { clientId: true },
      orderBy: { _count: { clientId: 'desc' } },
      take: 1,
    })
    if (busiestAds[0]) return busiestAds[0].clientId
    const first = await prisma.client.findFirst({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true } })
    return first?.id
  }
  // CLIENT (read-only): their own membership client
  const mem = await prisma.membership.findFirst({ where: { userId }, select: { clientId: true } })
  return mem?.clientId
}

async function lastSuccessfulSync(clientId: string) {
  return prisma.adSyncLog.findFirst({
    where: { clientId, status: 'SUCCESS' },
    orderBy: { startedAt: 'desc' },
    select: { startedAt: true, narrative: true },
  })
}

// ─── GET /api/ads/sync-status ───────────────────────────────────────────────────

const clientQuery = z.object({ clientId: id.optional() })

router.get('/sync-status', requireRole(['ADMIN', 'CLIENT']), async (req, res, next) => {
  try {
    const parsed = clientQuery.safeParse(req.query)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const { userId, role } = req.user!
    const clientId = await resolveClientId(userId, role, parsed.data.clientId)
    if (!clientId) return res.json({ empty: true })

    const [client, last, lastAttempt] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId }, select: { metaAdAccountId: true } }),
      lastSuccessfulSync(clientId),
      prisma.adSyncLog.findFirst({
        where: { clientId },
        orderBy: { startedAt: 'desc' },
        select: { status: true, startedAt: true, errorMessage: true },
      }),
    ])

    const lastSuccessAt = last?.startedAt ?? null
    const elapsed = lastSuccessAt ? Date.now() - lastSuccessAt.getTime() : Infinity
    const cooldownRemainingMs = Math.max(0, SYNC_COOLDOWN_MS - elapsed)

    return res.json({
      clientId,
      hasAdAccount: Boolean(client?.metaAdAccountId),
      lastSuccessAt,
      lastStatus: lastAttempt?.status ?? null,
      lastError: lastAttempt?.errorMessage ?? null,
      narrative: last?.narrative ?? null,
      cooldownRemainingMs,
      cooldownMs: SYNC_COOLDOWN_MS,
      canSync: role === 'ADMIN' && cooldownRemainingMs === 0,
    })
  } catch (error) {
    next(error)
  }
})

// ─── POST /api/ads/sync — manual sync (ADMIN only, 15-min cooldown) ──────────────

const syncSchema = z.object({ clientId: id.optional() })

router.post('/sync', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const parsed = syncSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const { userId, role } = req.user!
    const clientId = await resolveClientId(userId, role, parsed.data.clientId)
    if (!clientId) return res.status(404).json({ error: 'No client to sync.' })

    // Enforce the 15-minute cooldown against the last successful sync.
    const last = await lastSuccessfulSync(clientId)
    if (last) {
      const remaining = SYNC_COOLDOWN_MS - (Date.now() - last.startedAt.getTime())
      if (remaining > 0) {
        return res.status(429).json({
          error: 'Sync is on cooldown.',
          cooldownRemainingMs: remaining,
        })
      }
    }

    const started = Date.now()
    let logId: string | null = null

    try {
      logId = (await prisma.adSyncLog.create({
        data: { clientId, status: 'PENDING', triggeredBy: userId },
        select: { id: true },
      })).id
    } catch (logErr) {
      console.error('[ads/sync] failed to create sync log:', logErr)
      // Non-fatal — proceed without a log row
    }

    try {
      const result = await syncAdCampaigns(clientId)
      const narrative = await generateCampaignNarrative(clientId)
      if (logId) {
        await prisma.adSyncLog.update({
          where: { id: logId },
          data: { status: 'SUCCESS', completedAt: new Date(), durationMs: Date.now() - started, narrative },
        }).catch((e: unknown) => console.error('[ads/sync] log update failed:', e))
      }
      return res.json({ ok: true, result, narrative })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[ads/sync] sync failed:', msg)
      if (logId) {
        await prisma.adSyncLog.update({
          where: { id: logId },
          data: { status: 'FAILED', completedAt: new Date(), durationMs: Date.now() - started, errorMessage: msg },
        }).catch((e: unknown) => console.error('[ads/sync] log update failed:', e))
      }
      return res.status(502).json({ error: msg })
    }
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/ads/metrics — headline cards ──────────────────────────────────────

router.get('/metrics', requireRole(['ADMIN', 'CLIENT']), async (req, res, next) => {
  try {
    const parsed = clientQuery.safeParse(req.query)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const { userId, role } = req.user!
    const clientId = await resolveClientId(userId, role, parsed.data.clientId)
    if (!clientId) return res.json({ empty: true })

    // Anchor on the client's most recent ad metric so the dashboard shows real
    // spend even when the current month has no synced data yet.
    const refDate = anchorRefDate(await mostRecentAdDate(clientId), new Date())
    const { curStart, curEnd, prevStart, prevEnd } = dashboardPeriod(refDate)

    const [client, cur, prev, curCalls, prevCalls, curSetterLogs, prevSetterLogs] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId }, select: { currency: true, metaAdAccountId: true } }),
      prisma.adDailyMetric.findMany({ where: { clientId, date: { gte: curStart, lte: curEnd } } }),
      prisma.adDailyMetric.findMany({ where: { clientId, date: { gte: prevStart, lte: prevEnd } } }),
      // Call data for ROAS Cash/Rev, Cost/Call, Cost/Customer
      prisma.call.findMany({
        where: { clientId, deletedAt: null, date: { gte: curStart, lte: curEnd } },
        select: { outcome: true, revenueMinor: true, cashCollectedMinor: true },
      }),
      prisma.call.findMany({
        where: { clientId, deletedAt: null, date: { gte: prevStart, lte: prevEnd } },
        select: { outcome: true, revenueMinor: true, cashCollectedMinor: true },
      }),
      // Setter log data for Cost/Conversation
      prisma.setterLog.findMany({
        where: { clientId, date: { gte: curStart, lte: curEnd } },
        select: { newConvos: true },
      }),
      prisma.setterLog.findMany({
        where: { clientId, date: { gte: prevStart, lte: prevEnd } },
        select: { newConvos: true },
      }),
    ])
    const clientCurrency = client?.currency ?? 'USD'
    const rates = clientCurrency !== 'USD' ? await getLatestRates('USD') : {}
    const toUsdMinor = (amt: number) =>
      Math.round(convertToDisplay(amt, clientCurrency, 'USD', rates) * 100)
    const currency = 'USD'

    if (cur.length === 0 && prev.length === 0) {
      return res.json({ empty: true, currency, clientId, hasAdAccount: Boolean(client?.metaAdAccountId) })
    }

    // Aggregate ad daily metrics (impression-weighted CTR/CPM/CPC via sum then divide)
    // Monetary amounts are converted to USD; count/rate fields are currency-agnostic.
    const aggAd = (rows: typeof cur) => ({
      spend:       toUsdMinor(rows.reduce((s, m) => s + m.dailySpendMinor, 0)),
      leads:       rows.reduce((s, m) => s + (m.results ?? m.totalLeads ?? 0), 0),
      impressions: rows.reduce((s, m) => s + (m.impressions ?? 0), 0),
      clicks:      rows.reduce((s, m) => s + (m.clicks ?? 0), 0),
      follows:     rows.reduce((s, m) => s + m.newAdFollows, 0),
    })

    // Aggregate call data for ROAS and cost-per-X cards (converted to USD)
    const aggCalls = (calls: typeof curCalls) => {
      const taken = calls.filter((c) => c.outcome !== CallOutcome.RESCHEDULED)
      const won   = calls.filter((c) => isWonOutcome(c.outcome))
      return {
        callsTaken: taken.length,
        dealsWon:   won.length,
        revMinor:   toUsdMinor(won.reduce((s, c) => s + c.revenueMinor, 0)),
        cashMinor:  toUsdMinor(won.reduce((s, c) => s + c.cashCollectedMinor, 0)),
      }
    }

    const c  = aggAd(cur)
    const p  = aggAd(prev)
    const ca = aggCalls(curCalls)
    const pa = aggCalls(prevCalls)

    const curConvos  = curSetterLogs.reduce((s, l) => s + l.newConvos, 0)
    const prevConvos = prevSetterLogs.reduce((s, l) => s + l.newConvos, 0)

    // Ad-platform rates
    const ctr    = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0
    const prevCtr = p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0
    const cpc    = c.clicks      > 0 ? Math.round(c.spend / c.clicks) : 0
    const prevCpc = p.clicks     > 0 ? Math.round(p.spend / p.clicks) : 0
    const cpm    = c.impressions > 0 ? Math.round((c.spend / c.impressions) * 1000) : 0
    const prevCpm = p.impressions > 0 ? Math.round((p.spend / p.impressions) * 1000) : 0
    const cpf    = c.follows     > 0 ? Math.round(c.spend / c.follows) : 0
    const prevCpf = p.follows    > 0 ? Math.round(p.spend / p.follows) : 0

    // Cross-dataset cards (call × ad-spend)
    const roasCash         = c.spend > 0 ? Math.round((ca.cashMinor / c.spend) * 100) / 100 : 0
    const prevRoasCash     = p.spend > 0 ? Math.round((pa.cashMinor / p.spend) * 100) / 100 : 0
    const roasRev          = c.spend > 0 ? Math.round((ca.revMinor  / c.spend) * 100) / 100 : 0
    const prevRoasRev      = p.spend > 0 ? Math.round((pa.revMinor  / p.spend) * 100) / 100 : 0
    const costPerConvo     = curConvos      > 0 ? Math.round(c.spend / curConvos)      : 0
    const prevCostPerConvo = prevConvos     > 0 ? Math.round(p.spend / prevConvos)     : 0
    const costPerCall      = ca.callsTaken  > 0 ? Math.round(c.spend / ca.callsTaken)  : 0
    const prevCostPerCall  = pa.callsTaken  > 0 ? Math.round(p.spend / pa.callsTaken)  : 0
    const costPerCustomer  = ca.dealsWon    > 0 ? Math.round(c.spend / ca.dealsWon)    : 0
    const prevCostPerCustomer = pa.dealsWon > 0 ? Math.round(p.spend / pa.dealsWon)    : 0

    return res.json({
      currency,
      clientId,
      hasAdAccount: Boolean(client?.metaAdAccountId),
      kpis: {
        spend:               { value: c.spend,         currency, trendPct: trendPct(c.spend, p.spend) },
        leads:               { value: c.leads,                   trendPct: trendPct(c.leads, p.leads) },
        costPerFollower:     { value: cpf,             currency, trendPct: trendPct(cpf, prevCpf) },
        costPerConversation: { value: costPerConvo,    currency, trendPct: trendPct(costPerConvo, prevCostPerConvo) },
        roasCash:            { value: roasCash,                  trendPct: trendPct(roasCash, prevRoasCash) },
        roasRev:             { value: roasRev,                   trendPct: trendPct(roasRev, prevRoasRev) },
        costPerCall:         { value: costPerCall,     currency, trendPct: trendPct(costPerCall, prevCostPerCall) },
        costPerCustomer:     { value: costPerCustomer, currency, trendPct: trendPct(costPerCustomer, prevCostPerCustomer) },
        ctr:                 { value: Math.round(ctr * 100) / 100, trendPct: trendPct(ctr, prevCtr) },
        cpm:                 { value: cpm,             currency, trendPct: trendPct(cpm, prevCpm) },
        cpc:                 { value: cpc,             currency, trendPct: trendPct(cpc, prevCpc) },
      },
    })
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/ads/campaigns — campaign table (aggregated MTD) ────────────────────

router.get('/campaigns', requireRole(['ADMIN', 'CLIENT']), async (req, res, next) => {
  try {
    const parsed = clientQuery.safeParse(req.query)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const { userId, role } = req.user!
    const clientId = await resolveClientId(userId, role, parsed.data.clientId)
    if (!clientId) return res.json({ rows: [], currency: 'USD' })

    // Match the metrics window: anchor on the most recent ad metric.
    const refDate = anchorRefDate(await mostRecentAdDate(clientId), new Date())
    const { curStart: start, curEnd: end } = dashboardPeriod(refDate)
    const [client, campaigns, metrics] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId }, select: { currency: true } }),
      prisma.campaign.findMany({ where: { clientId }, orderBy: { name: 'asc' } }),
      prisma.adCreativeMetric.findMany({
        where: { clientId, date: { gte: start, lte: end }, campaignId: { not: null } },
        select: {
          campaignId: true,
          dailySpendMinor: true,
          impressions: true,
          clicks: true,
          results: true,
          reach: true,
        },
      }),
    ])
    const campClientCurrency = client?.currency ?? 'USD'
    const campRates = campClientCurrency !== 'USD' ? await getLatestRates('USD') : {}
    const campToUsd = (amt: number) =>
      Math.round(convertToDisplay(amt, campClientCurrency, 'USD', campRates) * 100)
    const currency = 'USD'

    const byCampaign = new Map<string, { spend: number; impressions: number; clicks: number; results: number; reach: number }>()
    for (const m of metrics) {
      const key = m.campaignId!
      if (!byCampaign.has(key)) byCampaign.set(key, { spend: 0, impressions: 0, clicks: 0, results: 0, reach: 0 })
      const agg = byCampaign.get(key)!
      agg.spend += m.dailySpendMinor ?? 0
      agg.impressions += m.impressions ?? 0
      agg.clicks += m.clicks ?? 0
      agg.results += m.results ?? 0
      agg.reach = Math.max(agg.reach, m.reach ?? 0)
    }

    const rows = campaigns.map((cp) => {
      const m = byCampaign.get(cp.id) ?? { spend: 0, impressions: 0, clicks: 0, results: 0, reach: 0 }
      const spendUsd = campToUsd(m.spend)
      const ctr = m.impressions > 0 ? Math.round((m.clicks / m.impressions) * 10000) / 100 : 0
      const cpl = m.results > 0 ? Math.round(spendUsd / m.results) : 0
      return {
        id: cp.id,
        name: cp.name,
        adType: cp.adType,
        status: cp.status,
        flaggedForReview: cp.flaggedForReview,
        flagReason: cp.flagReason,
        spendMinor: spendUsd,
        impressions: m.impressions,
        clicks: m.clicks,
        results: m.results,
        reach: m.reach,
        ctr,
        costPerLeadMinor: cpl,
        currency,
      }
    })

    return res.json({ currency, clientId, rows })
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/ads/daily-spend — daily spend time-series for chart ─────────────

const dailySpendQuery = z.object({
  clientId: id.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

router.get('/daily-spend', requireRole(['ADMIN', 'CLIENT']), async (req, res, next) => {
  try {
    const parsed = dailySpendQuery.safeParse(req.query)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const { userId, role } = req.user!
    const clientId = await resolveClientId(userId, role, parsed.data.clientId)
    if (!clientId) return res.json({ points: [] })

    const now = new Date()
    const toDate = parsed.data.to ? new Date(parsed.data.to) : now
    const fromDate = parsed.data.from
      ? new Date(parsed.data.from)
      : new Date(now.getFullYear(), now.getMonth(), 1)

    const rows = await prisma.adDailyMetric.findMany({
      where: { clientId, date: { gte: fromDate, lte: toDate } },
      select: { date: true, dailySpendMinor: true },
      orderBy: { date: 'asc' },
    })

    return res.json({
      points: rows.map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        spendMinor: r.dailySpendMinor,
      })),
    })
  } catch (error) {
    next(error)
  }
})

// ─── PATCH /api/ads/campaigns/:id/type — update adType (ADMIN only) ────────────

const campaignTypeSchema = z.object({ adType: z.enum(['TYPEFORM', 'NORMAL']) })

router.patch('/campaigns/:id/type', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const parsed = campaignTypeSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    })
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' })
    await prisma.campaign.update({
      where: { id: req.params.id },
      data: { adType: parsed.data.adType },
    })
    return res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

// ─── PATCH /api/ads/campaigns/:id/flag — flag/unflag for review (ADMIN) ──────────

const flagSchema = z.object({
  flagged: z.boolean(),
  reason: z.string().max(500).optional(),
})

router.patch('/campaigns/:id/flag', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const parsed = flagSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const { id } = req.params
    const { flagged, reason } = parsed.data

    const campaign = await prisma.campaign.findUnique({ where: { id }, select: { id: true } })
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' })

    await prisma.campaign.update({
      where: { id },
      data: {
        flaggedForReview: flagged,
        flagReason: flagged ? (reason ?? null) : null,
      },
    })
    return res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/ads/clients — list clients with a connected ad account (ADMIN) ────

router.get('/clients', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      where: { isActive: true, metaAdAccountId: { not: null } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })
    return res.json({ clients })
  } catch (error) {
    next(error)
  }
})

export default router
