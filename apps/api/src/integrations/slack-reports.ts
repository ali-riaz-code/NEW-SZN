// Phase 9 — report & leaderboard assembly.
//
// resolveReportRange/buildReportSummary are shared, non-Slack-specific
// computation reused by the PDF report pipeline (reports.ts / report-pdf.ts) so
// PDF numbers always match what the dashboards show. Slack itself only sends
// the closer leaderboard now (Daily/Weekly/Monthly Slack reports were removed —
// clients never receive Slack messages, so there is no per-client channel left
// to post them to; PDF reports remain available via the AI Reports page).
//
// Because logging is historical (the "current" month may be empty), ranges are
// resolved from the most recent day that actually has call data — mirroring the
// fallback pattern used by the Master dashboard route.

import { prisma } from '@new-szn/db'
import { aggregateOutcomes, closeRate, roas as calcRoas, currentMonthRange } from '@new-szn/db/kpi'
import { sendLeaderboard, type LeaderRow } from './slack'

export type Cadence = 'daily' | 'weekly' | 'monthly'

export interface DateRange {
  start: Date
  end: Date
}

export interface ReportSummary {
  clientName: string
  currency: string
  revenueMinor: number
  cashCollectedMinor: number
  dealsWon: number
  callsTaken: number
  closeRatePct: number
  adSpendMinor: number
  roas: number
  narrative?: string
}

// Most recent day on which this client has a logged call (drives the fallback).
async function mostRecentCallDate(clientId: string): Promise<Date | null> {
  const row = await prisma.call.findFirst({
    where: { clientId, deletedAt: null },
    orderBy: { date: 'desc' },
    select: { date: true },
  })
  return row?.date ?? null
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

// Resolve the reporting window for a cadence, anchored to the client's most
// recent data. Returns null if the client has no calls at all.
export async function resolveReportRange(
  clientId: string,
  cadence: Cadence,
): Promise<DateRange | null> {
  const anchor = await mostRecentCallDate(clientId)
  if (!anchor) return null

  if (cadence === 'monthly') {
    const { start, end } = currentMonthRange(anchor)
    return { start, end }
  }
  if (cadence === 'weekly') {
    const start = startOfDay(new Date(anchor.getTime() - 6 * 86400000))
    return { start, end: endOfDay(anchor) }
  }
  // daily
  return { start: startOfDay(anchor), end: endOfDay(anchor) }
}

// Build the report summary for a client over a window. Revenue/cash/deals/calls
// from the Call table; ad spend from AdDailyMetric; close rate + ROAS from the
// shared calculators. All amounts stay in the client's currency (minor units).
export async function buildReportSummary(
  clientId: string,
  range: DateRange,
): Promise<ReportSummary | null> {
  const [client, calls, adMetrics] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, select: { name: true, currency: true } }),
    prisma.call.findMany({
      where: { clientId, deletedAt: null, date: { gte: range.start, lte: range.end } },
      select: { outcome: true, revenueMinor: true, cashCollectedMinor: true },
    }),
    prisma.adDailyMetric.findMany({
      where: { clientId, date: { gte: range.start, lte: range.end } },
      select: { dailySpendMinor: true },
    }),
  ])
  if (!client) return null

  const agg = aggregateOutcomes(calls.map((c) => c.outcome))
  const revenueMinor = calls.reduce((s, c) => s + c.revenueMinor, 0)
  const cashCollectedMinor = calls.reduce((s, c) => s + c.cashCollectedMinor, 0)
  const adSpendMinor = adMetrics.reduce((s, m) => s + m.dailySpendMinor, 0)

  return {
    clientName: client.name,
    currency: client.currency,
    revenueMinor,
    cashCollectedMinor,
    dealsWon: agg.closed,
    callsTaken: agg.conducted,
    closeRatePct: closeRate(agg.closed, agg.conducted) * 100,
    adSpendMinor,
    roas: calcRoas(revenueMinor, adSpendMinor),
  }
}

// ─── Closer leaderboard ─────────────────────────────────────────────────────────

// Build leaderboard rows (per closer) for a window; sorted by revenue desc.
export async function buildLeaderboard(
  clientId: string,
  range: DateRange,
): Promise<{ currency: string; rows: LeaderRow[] } | null> {
  const [client, calls] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, select: { currency: true } }),
    prisma.call.findMany({
      where: { clientId, deletedAt: null, date: { gte: range.start, lte: range.end } },
      select: { outcome: true, revenueMinor: true, closer: { select: { id: true, name: true } } },
    }),
  ])
  if (!client) return null

  const byCloser = new Map<
    string,
    { name: string; revenueMinor: number; outcomes: import('@new-szn/db').CallOutcome[] }
  >()
  for (const c of calls) {
    const entry = byCloser.get(c.closer.id) ?? { name: c.closer.name, revenueMinor: 0, outcomes: [] }
    entry.revenueMinor += c.revenueMinor
    entry.outcomes.push(c.outcome)
    byCloser.set(c.closer.id, entry)
  }

  const rows: LeaderRow[] = [...byCloser.values()]
    .map((e) => {
      const agg = aggregateOutcomes(e.outcomes)
      return {
        name: e.name,
        revenueMinor: e.revenueMinor,
        deals: agg.closed,
        closeRatePct: closeRate(agg.closed, agg.conducted) * 100,
      }
    })
    .sort((a, b) => b.revenueMinor - a.revenueMinor)

  return { currency: client.currency, rows }
}

// Send the closer leaderboard to the global overall channel. Defaults to the
// monthly window when no range given.
export async function sendCloserLeaderboard(clientId: string, range?: DateRange): Promise<boolean> {
  const resolved = range ?? (await resolveReportRange(clientId, 'monthly'))
  if (!resolved) return false
  const board = await buildLeaderboard(clientId, resolved)
  if (!board) return false
  return sendLeaderboard(board.currency, board.rows)
}
