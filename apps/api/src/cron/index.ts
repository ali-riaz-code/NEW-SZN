// Background scheduled jobs. See docs/ai-features.md and docs/facebook-ads-integration.md.
//
// Implemented:
//   1. Hourly Facebook/Instagram ad sync (auto) — every client with a Meta ad account.
//   2. Daily closer leaderboard (Phase 9) — 08:00 daily, posted to the global
//      Slack overall channel (see integrations/slack.ts).
//
// Scaffolded (wired in later phases):
//   5. Anomaly detection (every 4 hours)      — Phase 10
//   6. Daily Slack target DMs (each morning)   — Phase 10
//   7. Scheduled PDF report generation         — Phase 11
//
// node-cron uses the server's local timezone. Jobs are guarded so a failure in one
// client's sync never aborts the batch.

import cron from 'node-cron'
import { prisma } from '@new-szn/db'
import { fetchAndCacheFxRates } from '@new-szn/db/kpi'
import { syncAdCampaigns } from '../integrations/facebook'
import { generateCampaignNarrative } from '../integrations/campaign-narrative'
import { sendCloserLeaderboard } from '../integrations/slack-reports'
import { runAnomalyDetection } from '../integrations/anomaly'
import { sendDailyTargets } from '../integrations/daily-targets'
import { generateReport } from '../integrations/reports'

let started = false

export function startCron(): void {
  if (started) return
  started = true

  // ── 1. Hourly Facebook ad sync ───────────────────────────────────────────────
  // At minute 5 of every hour, to avoid the top-of-hour thundering herd.
  cron.schedule('5 * * * *', () => {
    void runHourlyAdSync()
  })

  // ── 2. Daily closer leaderboard → global Slack overall channel ──────────────
  cron.schedule('0 8 * * *', () => void runDailyLeaderboard()) // every day 08:00

  // ── 5. Anomaly detection (Phase 10) — every 4 hours ──────────────────────────
  cron.schedule('0 */4 * * *', () => {
    void runAnomalyDetection().catch((err) => console.error('[cron] anomaly detection failed', err))
  })

  // ── 6. Daily target DMs (Phase 10) — 07:00 daily ─────────────────────────────
  cron.schedule('0 7 * * *', () => void runDailyTargets())

  // ── 7. Scheduled PDF reports — per-client cadence set via AI Reports page ───
  cron.schedule('0 9 * * *', () => void runScheduledReports('daily'))   // daily 09:00
  cron.schedule('0 9 * * 1', () => void runScheduledReports('weekly'))  // Mondays 09:00
  cron.schedule('0 9 1 * *', () => void runScheduledReports('monthly')) // 1st of month 09:00

  // ── 8. Live FX rate refresh — 06:00 daily, ahead of the report/target jobs ────
  cron.schedule('0 6 * * *', () => void runFxRefresh({ force: true }))
  // Backfill on boot when the cache is empty or >1 day stale (never blocks startup).
  void runFxRefresh()

  console.log(
    '[cron] scheduled: hourly ad sync; daily leaderboard (0 8 * * *); anomaly (0 */4 * * *); daily targets (0 7 * * *); PDF reports daily/weekly/monthly (per-client schedule); FX refresh (0 6 * * *)',
  )
}

// Refresh the FxRate cache from the live feed (exchangerate-api.com). Degrades
// gracefully: a missing FX_API_KEY or a feed error is logged and the app keeps
// using the last cached (or seeded) rates — never a hard failure, and never the
// silent raw-value re-inflation that an empty cache used to cause. On boot we only
// fetch when the cache is empty or more than a day stale.
async function runFxRefresh(opts: { force?: boolean } = {}): Promise<void> {
  try {
    if (!opts.force) {
      const latest = await prisma.fxRate.findFirst({
        where: { fromCurrency: 'USD' },
        orderBy: { date: 'desc' },
        select: { date: true },
      })
      if (latest) {
        const ageDays = (Date.now() - new Date(latest.date).getTime()) / 86_400_000
        if (ageDays < 1) return // already fresh
      }
    }
    await fetchAndCacheFxRates('USD')
    console.log('[cron] FX rates refreshed from live feed')
  } catch (err) {
    console.error(
      '[cron] FX refresh failed — keeping last cached/seeded rates:',
      err instanceof Error ? err.message : err,
    )
  }
}

// Generate PDF reports on a cadence for every active client. Attributed to a
// resolved admin (the Report.generatedBy FK requires a real user); skips if there
// is no admin or the client has no data to report on.
export async function runScheduledReports(cadence: 'daily' | 'weekly' | 'monthly'): Promise<void> {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN', isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (!admin) {
    console.error('[cron] scheduled reports skipped — no active admin to attribute them to')
    return
  }
  const clients = await prisma.client.findMany({
    where: { isActive: true, reportSchedule: cadence },
    select: { id: true, name: true },
  })
  if (clients.length === 0) return
  for (const client of clients) {
    try {
      const result = await generateReport(client.id, cadence, admin.id)
      if (!result.ok) console.log(`[cron] ${cadence} report skipped for ${client.name}: ${result.error}`)
    } catch (err) {
      console.error(`[cron] ${cadence} report failed for ${client.name}`, err)
    }
  }
}

// Send daily target DMs for every active client. sendDailyTargetDM no-ops per
// user when Daily Targets are globally disabled or a Slack id can't be resolved.
async function runDailyTargets(): Promise<void> {
  const clients = await prisma.client.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  })
  for (const client of clients) {
    try {
      await sendDailyTargets(client.id)
    } catch (err) {
      console.error(`[cron] daily targets failed for ${client.name}`, err)
    }
  }
}

// Post the closer leaderboard for every active client to the global Slack
// overall channel. sendCloserLeaderboard no-ops if leaderboards are disabled or
// no overall channel is set.
async function runDailyLeaderboard(): Promise<void> {
  const clients = await prisma.client.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  })
  if (clients.length === 0) return
  for (const client of clients) {
    try {
      await sendCloserLeaderboard(client.id)
    } catch (err) {
      console.error(`[cron] leaderboard failed for ${client.name}`, err)
    }
  }
}

export async function runHourlyAdSync(): Promise<void> {
  const clients = await prisma.client.findMany({
    where: { isActive: true, metaAdAccountId: { not: null } },
    select: { id: true, name: true },
  })
  if (clients.length === 0) return
  console.log(`[cron] hourly ad sync starting for ${clients.length} client(s)`)

  for (const client of clients) {
    const started = Date.now()
    const log = await prisma.adSyncLog.create({
      data: { clientId: client.id, status: 'PENDING', triggeredBy: 'auto' },
      select: { id: true },
    })
    try {
      await syncAdCampaigns(client.id)
      const narrative = await generateCampaignNarrative(client.id)
      await prisma.adSyncLog.update({
        where: { id: log.id },
        data: { status: 'SUCCESS', completedAt: new Date(), durationMs: Date.now() - started, narrative },
      })
    } catch (err) {
      console.error(`[cron] ad sync failed for ${client.name}`, err)
      await prisma.adSyncLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          durationMs: Date.now() - started,
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      })
    }
  }
  console.log('[cron] hourly ad sync complete')
}
