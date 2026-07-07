// Next Best Action (#4) — on-demand priorities for the Master dashboard.
//
// Surfaces 3–5 urgent, ranked priorities from current performance (pacing vs goal,
// close rate, leaderboard gaps, top objection, ad efficiency). Owns its own prompt;
// shares only the low-level chat transport with the other AI features.

import { prisma } from '@new-szn/db'
import {
  aggregateOutcomes,
  aggregateObjections,
  closeRate,
  roas as calcRoas,
  pacing as calcPacing,
  daysInMonth,
  daysElapsed,
} from '@new-szn/db/kpi'
import { chatCompleteList, isAiConfigured } from './openai'
import { formatMoney } from '../lib/money'
import { monthRangeFor, mostRecentCallDate } from '../lib/period'

export interface NbaOpts {
  tone?: string
  scope?: { closerId?: string } // closer sees only their own performance
}

const SYSTEM_BASE =
  'You are the operations lead for a digital marketing agency. Given the current performance ' +
  'snapshot, output 3 to 5 urgent, ranked next best actions. Each is a single imperative ' +
  'sentence, specific to the numbers, ordered most urgent first. No preamble, no markdown. ' +
  'Return a JSON array of strings.'

function systemPrompt(opts?: NbaOpts): string {
  return opts?.tone ? `${SYSTEM_BASE}\nAdopt this tone: ${opts.tone}.` : SYSTEM_BASE
}

export async function generateNextBestActions(clientId: string, opts?: NbaOpts): Promise<string[]> {
  if (!isAiConfigured()) return []
  const snapshot = await buildSnapshot(clientId, opts?.scope)
  if (!snapshot) return []
  return chatCompleteList(systemPrompt(opts), snapshot, { temperature: 0.5, maxTokens: 400 })
}

async function buildSnapshot(clientId: string, scope?: { closerId?: string }): Promise<string | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { name: true, currency: true },
  })
  if (!client) return null
  const anchor = await mostRecentCallDate(clientId)
  const range = monthRangeFor(anchor)
  if (!range || !anchor) return null
  const cur = client.currency

  const scopeFilter = scope?.closerId ? { closerId: scope.closerId } : {}
  const [calls, ads, revGoal] = await Promise.all([
    prisma.call.findMany({
      where: { clientId, ...scopeFilter, deletedAt: null, date: { gte: range.start, lte: range.end } },
      select: { outcome: true, revenueMinor: true, objectionType: true, closer: { select: { name: true } } },
    }),
    prisma.adDailyMetric.aggregate({
      where: { clientId, date: { gte: range.start, lte: range.end } },
      _sum: { dailySpendMinor: true },
    }),
    prisma.goal.findFirst({
      where: { clientId, kpiKey: 'revenue', month: anchor.getMonth() + 1, year: anchor.getFullYear() },
      select: { targetMinor: true },
    }),
  ])

  const agg = aggregateOutcomes(calls.map((c) => c.outcome))
  const revenue = calls.reduce((s, c) => s + c.revenueMinor, 0)
  const spend = ads._sum.dailySpendMinor ?? 0
  const objections = aggregateObjections(calls.map((c) => c.objectionType))
  const topObjection = Object.entries(objections).sort((a, b) => b[1] - a[1])[0]

  // Lagging closer = lowest close rate among those with >=3 conducted calls.
  const byCloser = new Map<string, { outcomes: (typeof calls)[number]['outcome'][] }>()
  for (const c of calls) {
    const e = byCloser.get(c.closer.name) ?? { outcomes: [] }
    e.outcomes.push(c.outcome)
    byCloser.set(c.closer.name, e)
  }
  let lagging: { name: string; rate: number } | null = null
  for (const [name, e] of byCloser) {
    const a = aggregateOutcomes(e.outcomes)
    if (a.conducted < 3) continue
    const rate = closeRate(a.closed, a.conducted) * 100
    if (!lagging || rate < lagging.rate) lagging = { name, rate }
  }

  const lines = [
    `Dashboard: Master (Next Best Action)`,
    `Client: ${client.name}`,
    `Period: ${range.monthLabel}`,
    `Revenue: ${formatMoney(revenue, cur)}`,
    `Deals won: ${agg.closed}`,
    `Close rate: ${(closeRate(agg.closed, agg.conducted) * 100).toFixed(1)}%`,
    `Ad spend: ${formatMoney(spend, cur)}`,
    `ROAS: ${calcRoas(revenue, spend).toFixed(2)}x`,
    `Most common objection: ${topObjection && topObjection[1] > 0 ? `${topObjection[0].replace(/_/g, ' ')} (${topObjection[1]})` : 'none recorded'}`,
  ]
  if (lagging) lines.push(`Lowest-converting closer: ${lagging.name} at ${lagging.rate.toFixed(1)}% close rate`)
  if (revGoal?.targetMinor) {
    const p = calcPacing(revenue, revGoal.targetMinor, daysElapsed(anchor), daysInMonth(anchor))
    lines.push(
      `Revenue goal: ${formatMoney(revGoal.targetMinor, cur)} — ${p.pctOfTarget.toFixed(0)}% achieved, ` +
        `projected ${formatMoney(Math.round(p.expected), cur)} (${p.onTrack ? 'on track' : 'behind pace'})`,
    )
  } else {
    lines.push(`Revenue goal: not set`)
  }
  return lines.join('\n')
}
