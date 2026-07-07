// Anomaly Detection (#3) — cron every 4 hours.
//
// For each active client, compares the anchor day's KPIs against the trailing
// 28-day rolling average. A drop of >20% raises a WARNING, >35% a CRITICAL.
// Each anomaly writes an Alert row and DMs every active admin (agency
// leadership sees all clients — there's no per-client admin scoping) via
// sendAnomalyAlert.
//
// Alert content is a DETERMINISTIC factual template — no OpenAI in this path — so
// alert wording is 100% consistent and the unattended cron has no external AI
// dependency. This is the one AI-features module that does not call OpenAI.

import { prisma } from '@new-szn/db'
import { aggregateOutcomes } from '@new-szn/db/kpi'
import type { AlertSeverity } from '@new-szn/db'
import { formatMoney } from '../lib/money'
import { sendAnomalyAlert } from './slack'
import { mostRecentCallDate } from '../lib/period'

// Defaults if a client has no override (mirror the Client column defaults).
const DEFAULT_WARNING_PCT = 20
const DEFAULT_CRITICAL_PCT = 35
const DEFAULT_CLOSE_RATE_WARNING_PCT = 20
const DEFAULT_CLOSE_RATE_CRITICAL_PCT = 35
const BASELINE_DAYS = 28

interface KpiDescriptor {
  key: string // machine key stored on Alert.kpiKey (matches goal kpiKeys)
  label: string // human label shown in Slack
  isMoney: boolean
}

const KPIS: KpiDescriptor[] = [
  { key: 'revenue', label: 'Revenue', isMoney: true },
  { key: 'dealsWon', label: 'Deals Won', isMoney: false },
  { key: 'callsTaken', label: 'Calls Conducted', isMoney: false },
  { key: 'adSpend', label: 'Ad Spend', isMoney: true },
]

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Agency leadership — anomaly DMs go to every active admin, not scoped to a
// client (admins already see all clients per the role model).
async function getAdminIds(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true },
  })
  return admins.map((a) => a.id)
}

async function notifyAdmins(adminIds: string[], payload: Parameters<typeof sendAnomalyAlert>[1]): Promise<void> {
  await Promise.all(adminIds.map((adminId) => sendAnomalyAlert(adminId, payload)))
}

export interface AnomalyResult {
  clientId: string
  kpiKey: string
  severity: AlertSeverity
  dropPct: number
}

// Run detection for every active client. `asOf` (default now→most-recent-data-day
// per client) lets verification target a real historical dip.
export async function runAnomalyDetection(asOf?: Date): Promise<AnomalyResult[]> {
  const clients = await prisma.client.findMany({
    where: { isActive: true },
    select: { id: true, name: true, currency: true },
  })
  const results: AnomalyResult[] = []
  for (const client of clients) {
    try {
      const found = await detectAnomaliesForClient(client.id, asOf)
      results.push(...found)
    } catch (err) {
      console.error(`[anomaly] failed for ${client.name}`, err)
    }
  }
  return results
}

// Run detection for a single client (used by the cron batch and verification).
export async function detectAnomaliesForClient(
  clientId: string,
  asOf?: Date,
): Promise<AnomalyResult[]> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      name: true,
      currency: true,
      anomalyWarningPct: true,
      anomalyCriticalPct: true,
      closeRateAnomalyWarningPct: true,
      closeRateAnomalyCriticalPct: true,
    },
  })
  if (!client) return []
  const anchor = asOf ?? (await mostRecentCallDate(clientId))
  if (!anchor) return []
  return detectForClient(clientId, client.name, client.currency, anchor, {
    warningPct: client.anomalyWarningPct,
    criticalPct: client.anomalyCriticalPct,
    closeRateWarningPct: client.closeRateAnomalyWarningPct,
    closeRateCriticalPct: client.closeRateAnomalyCriticalPct,
  })
}

interface Thresholds {
  warningPct: number
  criticalPct: number
  closeRateWarningPct: number
  closeRateCriticalPct: number
}

async function detectForClient(
  clientId: string,
  clientName: string,
  currency: string,
  anchor: Date,
  thresholds: Thresholds = {
    warningPct: DEFAULT_WARNING_PCT,
    criticalPct: DEFAULT_CRITICAL_PCT,
    closeRateWarningPct: DEFAULT_CLOSE_RATE_WARNING_PCT,
    closeRateCriticalPct: DEFAULT_CLOSE_RATE_CRITICAL_PCT,
  },
): Promise<AnomalyResult[]> {
  const { warningPct, criticalPct, closeRateWarningPct, closeRateCriticalPct } = thresholds
  const adminIds = await getAdminIds()
  const anchorDay = dayKey(anchor)
  // Window covers the anchor day plus the 28 baseline days before it.
  const windowStart = new Date(`${anchorDay}T00:00:00.000Z`)
  windowStart.setUTCDate(windowStart.getUTCDate() - BASELINE_DAYS)
  const windowEnd = new Date(`${anchorDay}T23:59:59.999Z`)

  const [calls, ads] = await Promise.all([
    prisma.call.findMany({
      where: { clientId, deletedAt: null, date: { gte: windowStart, lte: windowEnd } },
      select: { date: true, outcome: true, revenueMinor: true },
    }),
    prisma.adDailyMetric.findMany({
      where: { clientId, date: { gte: windowStart, lte: windowEnd } },
      select: { date: true, dailySpendMinor: true },
    }),
  ])

  // Per-day values for each KPI.
  const daily: Record<string, Record<string, number>> = {}
  const bump = (day: string, key: string, v: number) => {
    daily[day] ??= {}
    daily[day]![key] = (daily[day]![key] ?? 0) + v
  }
  for (const c of calls) {
    const day = dayKey(c.date)
    bump(day, 'revenue', c.revenueMinor)
    const agg = aggregateOutcomes([c.outcome])
    bump(day, 'dealsWon', agg.closed)
    bump(day, 'callsTaken', agg.conducted)
  }
  for (const a of ads) bump(dayKey(a.date), 'adSpend', a.dailySpendMinor)

  // Baseline days = the 28 calendar days before the anchor.
  const baselineDays: string[] = []
  for (let i = 1; i <= BASELINE_DAYS; i++) {
    const d = new Date(`${anchorDay}T00:00:00.000Z`)
    d.setUTCDate(d.getUTCDate() - i)
    baselineDays.push(dayKey(d))
  }

  const out: AnomalyResult[] = []
  for (const kpi of KPIS) {
    const actual = daily[anchorDay]?.[kpi.key] ?? 0
    const baselineTotal = baselineDays.reduce((s, d) => s + (daily[d]?.[kpi.key] ?? 0), 0)
    const avg = baselineTotal / BASELINE_DAYS
    if (avg <= 0) continue // no meaningful baseline to drop from

    const dropPct = ((avg - actual) / avg) * 100
    if (dropPct <= warningPct) continue

    const severity: AlertSeverity = dropPct > criticalPct ? 'CRITICAL' : 'WARNING'
    const fmt = (v: number) => (kpi.isMoney ? formatMoney(Math.round(v), currency) : String(Math.round(v)))
    const message = `${kpi.label} down ${dropPct.toFixed(1)}% vs 28-day average (${fmt(actual)} vs ${fmt(avg)}).`

    // Dedupe: don't re-raise the same unresolved alert on every 4-hour run.
    const existing = await prisma.alert.findFirst({
      where: {
        clientId,
        kpiKey: kpi.key,
        resolvedAt: null,
        createdAt: { gte: new Date(Date.now() - 20 * 3600 * 1000) },
      },
      select: { id: true },
    })
    if (existing) continue

    await prisma.alert.create({
      data: { clientId, severity, kpiKey: kpi.key, message, dropPct },
    })
    await notifyAdmins(adminIds, {
      clientName,
      severity,
      kpiKey: kpi.label,
      dropPct,
      message,
    })
    out.push({ clientId, kpiKey: kpi.key, severity, dropPct })
  }

  // Close Rate (dealsWon / callsTaken) is a ratio, not a summable total, so it's
  // computed separately from the KPIS loop above and uses its own thresholds.
  const actualCallsTaken = daily[anchorDay]?.callsTaken ?? 0
  const actualDealsWon = daily[anchorDay]?.dealsWon ?? 0
  const baselineCallsTaken = baselineDays.reduce((s, d) => s + (daily[d]?.callsTaken ?? 0), 0)
  const baselineDealsWon = baselineDays.reduce((s, d) => s + (daily[d]?.dealsWon ?? 0), 0)

  if (actualCallsTaken > 0 && baselineCallsTaken > 0) {
    const actualRate = actualDealsWon / actualCallsTaken
    const baselineRate = baselineDealsWon / baselineCallsTaken
    if (baselineRate > 0) {
      const dropPct = ((baselineRate - actualRate) / baselineRate) * 100
      if (dropPct > closeRateWarningPct) {
        const severity: AlertSeverity = dropPct > closeRateCriticalPct ? 'CRITICAL' : 'WARNING'
        const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`
        const message = `Close Rate down ${dropPct.toFixed(1)}% vs 28-day average (${fmtPct(actualRate)} vs ${fmtPct(baselineRate)}).`

        const existing = await prisma.alert.findFirst({
          where: {
            clientId,
            kpiKey: 'closeRate',
            resolvedAt: null,
            createdAt: { gte: new Date(Date.now() - 20 * 3600 * 1000) },
          },
          select: { id: true },
        })
        if (!existing) {
          await prisma.alert.create({
            data: { clientId, severity, kpiKey: 'closeRate', message, dropPct },
          })
          await notifyAdmins(adminIds, {
            clientName,
            severity,
            kpiKey: 'Close Rate',
            dropPct,
            message,
          })
          out.push({ clientId, kpiKey: 'closeRate', severity, dropPct })
        }
      }
    }
  }

  return out
}
