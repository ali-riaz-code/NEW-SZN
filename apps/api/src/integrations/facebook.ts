// Facebook / Instagram (Meta) Marketing API integration.
// See docs/facebook-ads-integration.md.
//
// Auth model: a single agency system-user token (META_SYSTEM_USER_TOKEN) that has
// been granted access to each client's ad account. Each client stores its own
// `metaAdAccountId` ("act_..."); clients without one simply don't sync.
//
// Money: the Meta API returns spend/cpc/cpm as decimal strings in the account's
// currency major units. We convert to Int minor units at ingest and always store
// the currency code alongside — never assume USD.

import { prisma } from '@new-szn/db'

const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? 'v21.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`
const RETENTION_DAYS = 90

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  initialDelayMs = 1000,
): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxAttempts) {
        const delayMs = initialDelayMs * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }
  throw lastError || new Error('All retry attempts failed')
}

export interface SyncResult {
  clientId: string
  campaignsUpserted: number
  dailyMetricsUpserted: number
  creativeMetricsUpserted: number
  windowDays: number
}

function token(): string {
  const t = process.env.META_SYSTEM_USER_TOKEN
  if (!t) throw new Error('META_SYSTEM_USER_TOKEN is not configured')
  return t
}

// Major-unit decimal string → Int minor units. "" / null → 0.
function toMinor(v: string | number | null | undefined): number {
  if (v == null || v === '') return 0
  const n = typeof v === 'number' ? v : parseFloat(v)
  if (isNaN(n)) return 0
  return Math.round(n * 100)
}

function toInt(v: string | number | null | undefined): number {
  if (v == null || v === '') return 0
  const n = typeof v === 'number' ? v : parseInt(String(v), 10)
  return isNaN(n) ? 0 : n
}

function toDec(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? null : n
}

// Meta paginates via a `paging.next` absolute URL. Follow it until exhausted.
async function graphGetAll<T>(url: string): Promise<T[]> {
  const out: T[] = []
  let next: string | undefined = url
  let guard = 0
  while (next && guard < 50) {
    guard++
    const res = await fetch(next)
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Meta API ${res.status}: ${body.slice(0, 400)}`)
    }
    const json = (await res.json()) as { data?: T[]; paging?: { next?: string } }
    if (json.data) out.push(...json.data)
    next = json.paging?.next
  }
  return out
}

interface MetaCampaign {
  id: string
  name: string
  status: string
  daily_budget?: string
  objective?: string
}

interface MetaInsight {
  date_start: string
  date_stop: string
  campaign_id?: string
  campaign_name?: string
  spend?: string
  impressions?: string
  reach?: string
  clicks?: string
  ctr?: string
  cpc?: string
  cpm?: string
  frequency?: string
  actions?: Array<{ action_type: string; value: string }>
  cost_per_action_type?: Array<{ action_type: string; value: string }>
}

// Heuristic: campaigns whose objective/name points at a Typeform lead flow are
// "Typeform-focused"; everything else is "Normal". (docs/dashboards/ads.md)
function classifyAdType(c: MetaCampaign): 'TYPEFORM' | 'NORMAL' {
  const hay = `${c.name} ${c.objective ?? ''}`.toLowerCase()
  return hay.includes('typeform') || hay.includes('lead') ? 'TYPEFORM' : 'NORMAL'
}

function sumAction(insight: MetaInsight, types: string[]): number {
  if (!insight.actions) return 0
  return insight.actions
    .filter((a) => types.includes(a.action_type))
    .reduce((s, a) => s + toInt(a.value), 0)
}

// Sync one client's campaigns + daily/creative metrics for the trailing window.
export async function syncAdCampaigns(clientId: string, windowDays = 30): Promise<SyncResult> {
  return withRetry(() => syncAdCampaignsInternal(clientId, windowDays))
}

async function syncAdCampaignsInternal(clientId: string, windowDays = 30): Promise<SyncResult> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, currency: true, metaAdAccountId: true },
  })
  if (!client) throw new Error('Client not found')
  if (!client.metaAdAccountId) {
    throw new Error('Client has no Meta ad account configured (metaAdAccountId).')
  }

  // Normalise: Meta requires the "act_" prefix on account IDs.
  const acct = client.metaAdAccountId.startsWith('act_')
    ? client.metaAdAccountId
    : `act_${client.metaAdAccountId}`
  const currency = client.currency
  const tk = token()

  // Trailing window, clamped to retention.
  const days = Math.min(windowDays, RETENTION_DAYS)
  const since = new Date()
  since.setDate(since.getDate() - (days - 1))
  const sinceStr = since.toISOString().slice(0, 10)
  const untilStr = new Date().toISOString().slice(0, 10)
  const timeRange = encodeURIComponent(JSON.stringify({ since: sinceStr, until: untilStr }))

  // 1. Campaigns
  const campaignFields = 'id,name,status,daily_budget,objective'
  const campaigns = await graphGetAll<MetaCampaign>(
    `${GRAPH_BASE}/${acct}/campaigns?fields=${campaignFields}&limit=200&access_token=${tk}`,
  )

  const campaignIdMap = new Map<string, string>() // facebookId → local Campaign.id
  for (const c of campaigns) {
    const row = await prisma.campaign.upsert({
      where: { clientId_facebookId: { clientId, facebookId: c.id } },
      update: {
        name: c.name,
        status: c.status,
        adType: classifyAdType(c),
        dailyBudgetMinor: c.daily_budget ? toMinor(c.daily_budget) : null,
        currency,
      },
      create: {
        clientId,
        facebookId: c.id,
        name: c.name,
        status: c.status,
        adType: classifyAdType(c),
        dailyBudgetMinor: c.daily_budget ? toMinor(c.daily_budget) : null,
        currency,
      },
      select: { id: true },
    })
    campaignIdMap.set(c.id, row.id)
  }

  // 2. Account-level daily insights (headline cards)
  const insightFields =
    'spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,cost_per_action_type'
  const dailyInsights = await graphGetAll<MetaInsight>(
    `${GRAPH_BASE}/${acct}/insights?fields=${insightFields}&level=account&time_increment=1&time_range=${timeRange}&access_token=${tk}`,
  )

  let dailyMetricsUpserted = 0
  for (const ins of dailyInsights) {
    const date = new Date(`${ins.date_start}T00:00:00`)
    const spend = toMinor(ins.spend)
    const results = sumAction(ins, ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead'])
    const follows = sumAction(ins, ['like', 'onsite_conversion.follow', 'follow'])
    const convos = sumAction(ins, ['onsite_conversion.messaging_conversation_started_7d'])
    await prisma.adDailyMetric.upsert({
      where: { clientId_date: { clientId, date } },
      update: {
        currency,
        dailySpendMinor: spend,
        totalLeads: results,
        reach: toInt(ins.reach),
        impressions: toInt(ins.impressions),
        clicks: toInt(ins.clicks),
        ctr: toDec(ins.ctr),
        cpmMinor: toMinor(ins.cpm),
        cpcMinor: toMinor(ins.cpc),
        results,
        costPerResultMinor: results > 0 ? Math.round(spend / results) : null,
        costPerFollowerMinor: follows > 0 ? Math.round(spend / follows) : null,
        costPerConversationMinor: convos > 0 ? Math.round(spend / convos) : null,
      },
      create: {
        clientId,
        date,
        currency,
        dailySpendMinor: spend,
        totalLeads: results,
        reach: toInt(ins.reach),
        impressions: toInt(ins.impressions),
        clicks: toInt(ins.clicks),
        ctr: toDec(ins.ctr),
        cpmMinor: toMinor(ins.cpm),
        cpcMinor: toMinor(ins.cpc),
        results,
        costPerResultMinor: results > 0 ? Math.round(spend / results) : null,
        costPerFollowerMinor: follows > 0 ? Math.round(spend / follows) : null,
        costPerConversationMinor: convos > 0 ? Math.round(spend / convos) : null,
      },
    })
    dailyMetricsUpserted++
  }

  // 3. Per-campaign daily insights (creative-level table rows)
  const campaignInsights = await graphGetAll<MetaInsight>(
    `${GRAPH_BASE}/${acct}/insights?fields=${insightFields},campaign_id,campaign_name&level=campaign&time_increment=1&time_range=${timeRange}&access_token=${tk}`,
  )

  let creativeMetricsUpserted = 0
  for (const ins of campaignInsights) {
    if (!ins.campaign_id) continue
    const date = new Date(`${ins.date_start}T00:00:00`)
    const localCampaignId = campaignIdMap.get(ins.campaign_id) ?? null
    const spend = toMinor(ins.spend)
    const results = sumAction(ins, ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead'])

    // AdCreativeMetric has no unique key on (clientId, campaignId, date) — dedupe manually.
    const existing = await prisma.adCreativeMetric.findFirst({
      where: { clientId, campaignId: localCampaignId, date, adLabel: ins.campaign_name ?? 'Campaign' },
      select: { id: true },
    })
    const payload = {
      clientId,
      campaignId: localCampaignId,
      date,
      adLabel: ins.campaign_name ?? 'Campaign',
      currency,
      dailySpendMinor: spend,
      reach: toInt(ins.reach),
      frequency: toDec(ins.frequency),
      impressions: toInt(ins.impressions),
      clicks: toInt(ins.clicks),
      ctr: toDec(ins.ctr),
      cpmMinor: toMinor(ins.cpm),
      cpcMinor: toMinor(ins.cpc),
      results,
      costPerResultMinor: results > 0 ? Math.round(spend / results) : null,
    }
    if (existing) {
      await prisma.adCreativeMetric.update({ where: { id: existing.id }, data: payload })
    } else {
      await prisma.adCreativeMetric.create({ data: payload })
    }
    creativeMetricsUpserted++
  }

  // 4. Prune data older than the 90-day retention window.
  await pruneOldAdData(clientId)

  return {
    clientId,
    campaignsUpserted: campaigns.length,
    dailyMetricsUpserted,
    creativeMetricsUpserted,
    windowDays: days,
  }
}

// Enforce the 90-day retention policy for a client's ad data.
export async function pruneOldAdData(clientId: string): Promise<void> {
  return withRetry(async () => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)
    await Promise.all([
      prisma.adDailyMetric.deleteMany({ where: { clientId, date: { lt: cutoff } } }),
      prisma.adCreativeMetric.deleteMany({ where: { clientId, date: { lt: cutoff } } }),
    ])
  })
}
