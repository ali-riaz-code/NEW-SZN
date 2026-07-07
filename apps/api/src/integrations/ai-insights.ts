// AI Insights (#1) — on-demand, per-dashboard observations.
//
// Trigger: user clicks "Get AI Insights" on a dashboard. Output: 4–6 plain-English
// observations rendered inline. This module owns its own prompt; it shares only the
// low-level chat transport (openai.ts) with the other AI features.

import { prisma } from '@new-szn/db'
import {
  aggregateObjections,
  computeCallKpis,
  isWonOutcome,
  roas as calcRoas,
} from '@new-szn/db/kpi'
import { chatCompleteList, isAiConfigured } from './openai'
import { formatMoney } from '../lib/money'
import {
  monthRangeFor,
  mostRecentCallDate,
  mostRecentAdDate,
  mostRecentSetterDate,
  type MonthRange,
} from '../lib/period'

export type DashboardKind = 'master' | 'sales' | 'ads' | 'setter'

// Data-isolation scope. Closers/setters see only their own rows (mirrors the
// dashboard route scoping); admins/clients pass no scope (client-wide).
export interface Scope {
  closerId?: string
  setterId?: string
}

export interface InsightOpts {
  tone?: string // AI coaching personality, injected by Phase 11 Settings
  scope?: Scope
}

const SYSTEM_BASE =
  'You are a performance analyst for a digital marketing agency dashboard. Given a snapshot ' +
  'of this period\'s metrics, produce 4 to 6 short, specific, plain-English observations a ' +
  'manager can act on. Each observation is a single sentence, concrete, and references the ' +
  'actual numbers. No preamble, no markdown, no headers. Return a JSON array of strings.'

function systemPrompt(opts?: InsightOpts): string {
  return opts?.tone ? `${SYSTEM_BASE}\nAdopt this tone: ${opts.tone}.` : SYSTEM_BASE
}

// Returns [] when AI is unconfigured or there's no data — callers render an empty state.
export async function generateInsights(
  clientId: string,
  dashboard: DashboardKind,
  opts?: InsightOpts,
): Promise<string[]> {
  if (!isAiConfigured()) return []
  const snapshot = await buildSnapshot(clientId, dashboard, opts?.scope)
  if (!snapshot) return []
  return chatCompleteList(systemPrompt(opts), snapshot, { temperature: 0.4, maxTokens: 500 })
}

async function buildSnapshot(
  clientId: string,
  dashboard: DashboardKind,
  scope?: Scope,
): Promise<string | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { name: true, currency: true },
  })
  if (!client) return null
  const cur = client.currency

  if (dashboard === 'ads') return buildAdsSnapshot(clientId, client.name, cur)
  if (dashboard === 'setter') return buildSetterSnapshot(clientId, client.name, scope)

  // master + sales both draw on the call table for the most recent call month.
  const range = monthRangeFor(await mostRecentCallDate(clientId))
  if (!range) return null
  return dashboard === 'sales'
    ? buildSalesSnapshot(clientId, client.name, cur, range, scope)
    : buildMasterSnapshot(clientId, client.name, cur, range, scope)
}

// Own-calls filter for closer scope (empty object = client-wide).
function callScope(scope?: Scope) {
  return scope?.closerId ? { closerId: scope.closerId } : {}
}

async function buildMasterSnapshot(
  clientId: string,
  name: string,
  cur: string,
  range: MonthRange,
  scope?: Scope,
): Promise<string> {
  const [calls, ads] = await Promise.all([
    prisma.call.findMany({
      where: { clientId, ...callScope(scope), deletedAt: null, date: { gte: range.start, lte: range.end } },
      select: { outcome: true, revenueMinor: true, cashCollectedMinor: true, closer: { select: { name: true } } },
    }),
    prisma.adDailyMetric.aggregate({
      where: { clientId, date: { gte: range.start, lte: range.end } },
      _sum: { dailySpendMinor: true },
    }),
  ])
  // Same won-only formulas the dashboard shows — so the AI cites numbers that
  // match the cards (deposits never inflate revenue here).
  const k = computeCallKpis(calls)
  const spend = ads._sum.dailySpendMinor ?? 0
  const topCloser = topByRevenue(calls.filter((c) => isWonOutcome(c.outcome)))
  return [
    `Dashboard: Master`,
    `Client: ${name}`,
    `Period: ${range.monthLabel}`,
    `Revenue: ${formatMoney(k.revenueMinor, cur)}`,
    `Cash collected: ${formatMoney(k.cashMinor, cur)}`,
    `Deals won: ${k.dealsWon}`,
    `Calls conducted: ${k.callsTaken}`,
    `Close rate: ${k.closeRatePct.toFixed(1)}%`,
    `Show-up rate: ${k.showUpRatePct.toFixed(1)}%`,
    `Ad spend tracked this period: ${formatMoney(spend, cur)}`,
    `ROAS: ${calcRoas(k.revenueMinor, spend).toFixed(2)}x`,
    `Top closer by revenue: ${topCloser ?? 'n/a'}`,
  ].join('\n')
}

async function buildSalesSnapshot(
  clientId: string,
  name: string,
  cur: string,
  range: MonthRange,
  scope?: Scope,
): Promise<string> {
  const calls = await prisma.call.findMany({
    where: { clientId, ...callScope(scope), deletedAt: null, date: { gte: range.start, lte: range.end } },
    select: { outcome: true, revenueMinor: true, cashCollectedMinor: true, objectionType: true },
  })
  // Won-only revenue/deals via the shared calc — matches the Sales dashboard cards.
  const k = computeCallKpis(calls)
  const objections = aggregateObjections(calls.map((c) => c.objectionType))
  const topObjection = Object.entries(objections).sort((a, b) => b[1] - a[1])[0]
  return [
    `Dashboard: Sales & Closing`,
    `Client: ${name}`,
    `Period: ${range.monthLabel}`,
    `Revenue: ${formatMoney(k.revenueMinor, cur)}`,
    `Deals won: ${k.dealsWon}`,
    `Deals lost (showed but didn't close): ${k.dealsLost}`,
    `Close rate: ${k.closeRatePct.toFixed(1)}%`,
    `Show-up rate: ${k.showUpRatePct.toFixed(1)}%`,
    `No-shows: ${k.noShows}`,
    `Average deal size: ${formatMoney(k.avgDealMinor, cur)}`,
    `Most common objection: ${topObjection && topObjection[1] > 0 ? `${topObjection[0].replace(/_/g, ' ')} (${topObjection[1]})` : 'none recorded'}`,
  ].join('\n')
}

async function buildAdsSnapshot(clientId: string, name: string, cur: string): Promise<string | null> {
  const range = monthRangeFor(await mostRecentAdDate(clientId))
  if (!range) return null
  const ads = await prisma.adDailyMetric.findMany({
    where: { clientId, date: { gte: range.start, lte: range.end } },
    select: { dailySpendMinor: true, newAdFollows: true, callsBooked: true, revenueMinor: true, cashCollectedMinor: true, costPerLeadMinor: true },
  })
  const spend = ads.reduce((s, m) => s + m.dailySpendMinor, 0)
  const follows = ads.reduce((s, m) => s + m.newAdFollows, 0)
  const booked = ads.reduce((s, m) => s + m.callsBooked, 0)
  const revenue = ads.reduce((s, m) => s + m.revenueMinor, 0)
  const costPerFollow = follows > 0 ? Math.round(spend / follows) : 0
  return [
    `Dashboard: Ads`,
    `Client: ${name}`,
    `Period: ${range.monthLabel}`,
    `Total spend: ${formatMoney(spend, cur)}`,
    `New ad follows: ${follows}`,
    `Cost per follow: ${formatMoney(costPerFollow, cur)}`,
    `Calls booked (attributed): ${booked}`,
    `Revenue (attributed): ${formatMoney(revenue, cur)}`,
    `ROAS: ${calcRoas(revenue, spend).toFixed(2)}x`,
  ].join('\n')
}

async function buildSetterSnapshot(clientId: string, name: string, scope?: Scope): Promise<string | null> {
  const range = monthRangeFor(await mostRecentSetterDate(clientId))
  if (!range) return null
  const logs = await prisma.setterLog.findMany({
    where: {
      clientId,
      ...(scope?.setterId ? { setterId: scope.setterId } : {}),
      date: { gte: range.start, lte: range.end },
    },
    select: { newConvos: true, responses: true, offers: true, bookedCalls: true, followUps: true },
  })
  const sum = (k: 'newConvos' | 'responses' | 'offers' | 'bookedCalls' | 'followUps') =>
    logs.reduce((s, l) => s + l[k], 0)
  const convos = sum('newConvos')
  const responses = sum('responses')
  const offers = sum('offers')
  const booked = sum('bookedCalls')
  const pct = (n: number, d: number) => (d > 0 ? ((n / d) * 100).toFixed(1) : '0.0')
  return [
    `Dashboard: Appointment Setting`,
    `Client: ${name}`,
    `Period: ${range.monthLabel}`,
    `New conversations: ${convos}`,
    `Responses: ${responses}`,
    `Call proposals/offers: ${offers}`,
    `Calls booked: ${booked}`,
    `Follow-ups: ${sum('followUps')}`,
    `Response rate: ${pct(responses, convos)}%`,
    `Booked-per-conversation: ${pct(booked, convos)}%`,
  ].join('\n')
}

function topByRevenue(calls: { revenueMinor: number; closer: { name: string } }[]): string | null {
  const byCloser = new Map<string, number>()
  for (const c of calls) byCloser.set(c.closer.name, (byCloser.get(c.closer.name) ?? 0) + c.revenueMinor)
  const top = [...byCloser.entries()].sort((a, b) => b[1] - a[1])[0]
  return top ? top[0] : null
}
