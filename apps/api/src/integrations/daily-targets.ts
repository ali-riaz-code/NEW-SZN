// Daily Targets (#5) — morning cron. Personalized Slack DM to each closer and
// setter with today's target, derived from pacing vs the monthly goal.
//
// Owns its own prompt. Uses OpenAI to phrase the DM when configured, with a clear
// template fallback. Delivery is via sendDailyTargetDM, which resolves each
// user's Slack id (stored or looked up live by email) and DMs them directly.

import { prisma } from '@new-szn/db'
import { aggregateOutcomes, daysInMonth, daysElapsed } from '@new-szn/db/kpi'
import { chatComplete, isAiConfigured } from './openai'
import { sendDailyTargetDM } from './slack'
import { formatMoney } from '../lib/money'
import { monthRangeFor } from '../lib/period'
import { getAiTone } from '../lib/ai-config'

export interface TargetOpts {
  tone?: string
}

export interface DailyTargetSnapshot {
  userId: string
  name: string
  role: 'CLOSER' | 'SETTER'
  slackUserId: string | null
  metricLabel: string
  mtdText: string
  goalText: string
  dailyNeedText: string
  remainingDays: number
}

// Compute today's target snapshot for every closer/setter member of a client.
// `asOf` anchors the month (default now); pass a data-rich month for verification.
export async function computeDailyTargets(
  clientId: string,
  asOf: Date = new Date(),
): Promise<DailyTargetSnapshot[]> {
  const range = monthRangeFor(asOf)
  if (!range) return []
  // Local month/year to match currentMonthRange (used by monthRangeFor).
  const month = asOf.getMonth() + 1
  const year = asOf.getFullYear()

  const [client, members, calls, setterLogs, goals] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, select: { currency: true } }),
    prisma.membership.findMany({
      where: { clientId, user: { isActive: true, role: { in: ['CLOSER', 'SETTER'] } } },
      select: { user: { select: { id: true, name: true, role: true, slackUserId: true } } },
    }),
    prisma.call.findMany({
      where: { clientId, deletedAt: null, date: { gte: range.start, lte: range.end } },
      select: { closerId: true, outcome: true, revenueMinor: true },
    }),
    prisma.setterLog.findMany({
      where: { clientId, date: { gte: range.start, lte: range.end } },
      select: { setterId: true, bookedCalls: true },
    }),
    prisma.goal.findMany({
      where: { clientId, month, year, kpiKey: { in: ['revenue', 'bookedCalls'] } },
      select: { kpiKey: true, targetMinor: true, targetValue: true },
    }),
  ])
  if (!client) return []
  const cur = client.currency

  const remainingDays = Math.max(1, daysInMonth(asOf) - daysElapsed(asOf))
  const revGoal = goals.find((g) => g.kpiKey === 'revenue')?.targetMinor ?? 0
  const bookedGoal = Number(goals.find((g) => g.kpiKey === 'bookedCalls')?.targetValue ?? 0)

  const teamRevenue = calls.reduce((s, c) => s + c.revenueMinor, 0)
  const teamBooked = setterLogs.reduce((s, l) => s + l.bookedCalls, 0)
  const revDailyNeed = Math.max(0, Math.round((revGoal - teamRevenue) / remainingDays))
  const bookedDailyNeed = Math.max(0, Math.ceil((bookedGoal - teamBooked) / remainingDays))

  const revByCloser = new Map<string, number>()
  for (const c of calls) revByCloser.set(c.closerId, (revByCloser.get(c.closerId) ?? 0) + c.revenueMinor)
  const bookedBySetter = new Map<string, number>()
  for (const l of setterLogs) bookedBySetter.set(l.setterId, (bookedBySetter.get(l.setterId) ?? 0) + l.bookedCalls)

  const out: DailyTargetSnapshot[] = []
  for (const m of members) {
    const u = m.user
    if (u.role === 'CLOSER') {
      out.push({
        userId: u.id,
        name: u.name,
        role: 'CLOSER',
        slackUserId: u.slackUserId,
        metricLabel: 'revenue',
        mtdText: formatMoney(revByCloser.get(u.id) ?? 0, cur),
        goalText: revGoal > 0 ? formatMoney(revGoal, cur) : 'not set',
        dailyNeedText: revGoal > 0 ? `${formatMoney(revDailyNeed, cur)}/day (team)` : 'keep closing',
        remainingDays,
      })
    } else {
      out.push({
        userId: u.id,
        name: u.name,
        role: 'SETTER',
        slackUserId: u.slackUserId,
        metricLabel: 'booked calls',
        mtdText: String(bookedBySetter.get(u.id) ?? 0),
        goalText: bookedGoal > 0 ? String(bookedGoal) : 'not set',
        dailyNeedText: bookedGoal > 0 ? `${bookedDailyNeed}/day (team)` : 'keep booking',
        remainingDays,
      })
    }
  }
  return out
}

// Phrase a snapshot into a short DM. OpenAI when configured; template otherwise.
export async function renderTargetText(s: DailyTargetSnapshot, opts?: TargetOpts): Promise<string> {
  if (isAiConfigured()) {
    try {
      const sys =
        'You are a concise sales coach. Write a 1-2 sentence personalized daily target message. ' +
        'Be motivating and specific to the numbers. No markdown.' +
        (opts?.tone ? ` Adopt this tone: ${opts.tone}.` : '')
      const user = [
        `Name: ${s.name}`,
        `Role: ${s.role}`,
        `Metric: ${s.metricLabel}`,
        `Their month-to-date: ${s.mtdText}`,
        `Monthly team goal: ${s.goalText}`,
        `Team pace needed: ${s.dailyNeedText}`,
        `Days left in month: ${s.remainingDays}`,
      ].join('\n')
      return await chatComplete([{ role: 'system', content: sys }, { role: 'user', content: user }], {
        temperature: 0.6,
        maxTokens: 120,
      })
    } catch (err) {
      console.error('[daily-targets] AI phrasing failed, using template', err)
    }
  }
  return `${s.name}, today's target: ${s.dailyNeedText}. You're at ${s.mtdText} MTD (${s.metricLabel}) vs goal ${s.goalText}, ${s.remainingDays} days left.`
}

// Send targets. DMs each closer/setter directly via sendDailyTargetDM (which
// resolves their Slack id — stored or looked up live by email).
export async function sendDailyTargets(
  clientId: string,
  asOf?: Date,
  opts?: { tone?: string },
): Promise<number> {
  const snapshots = await computeDailyTargets(clientId, asOf)
  // Personality is per-dashboard: closers get the 'sales' tone, setters the
  // 'setter' tone (Phase 11). An explicit opts.tone (verification) overrides both.
  const [salesTone, setterTone] = opts?.tone
    ? [opts.tone, opts.tone]
    : await Promise.all([getAiTone('sales'), getAiTone('setter')])
  let sent = 0
  for (const s of snapshots) {
    const tone = s.role === 'CLOSER' ? salesTone : setterTone
    const text = await renderTargetText(s, { tone })
    const ok = await sendDailyTargetDM(s.userId, `${s.name}: ${text}`)
    if (ok) sent++
  }
  return sent
}
