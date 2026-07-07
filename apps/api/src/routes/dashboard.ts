import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '@new-szn/db'
import type { CallOutcome } from '@new-szn/db'
import {
  currentMonthRange,
  daysElapsed,
  daysInMonth,
  aggregateOutcomes,
  isWonOutcome,
  computeCallKpis,
  closeRate,
  showUpRate,
  roas as calcRoas,
  pacing as calcPacing,
  goalProgress,
  getLatestRates,
  convertToDisplay,
} from '@new-szn/db/kpi'
import { requireRole } from '../middleware/auth'
import { id } from '../lib/validation'

const router = Router()

const querySchema = z.object({
  clientId: id.optional(),
})

function trendPct(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0
  return Math.round(((cur - prev) / prev) * 1000) / 10
}

// Setter conversion rate = calls set / conversations, as a rounded percentage.
function setterConversionRate(callsSet: number, conversations: number): number {
  if (conversations === 0) return 0
  return Math.round((callsSet / conversations) * 1000) / 10
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Build a rolling 6-month trend (won-deal revenue + deal count per month) ending
// on `refDate`'s month. Far more purposeful than a single month's cumulative line:
// it shows the agency's real trajectory across the data-rich window. `calls` may
// span any range — only rows landing in the 6 buckets are counted.
function buildMonthlyTrend(
  calls: Array<{ date: Date; outcome: CallOutcome; revenueMinor: number }>,
  refDate: Date,
): {
  revenueTrend: Array<{ label: string; value: number }>
  dealsTrend: Array<{ label: string; value: number }>
} {
  const buckets = [] as Array<{ y: number; m: number; label: string; revenue: number; deals: number }>
  for (let i = 5; i >= 0; i--) {
    const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1)
    buckets.push({ y: d.getFullYear(), m: d.getMonth(), label: MONTH_ABBR[d.getMonth()]!, revenue: 0, deals: 0 })
  }
  for (const c of calls) {
    if (!isWonOutcome(c.outcome)) continue
    const cy = c.date.getFullYear()
    const cm = c.date.getMonth()
    const b = buckets.find((x) => x.y === cy && x.m === cm)
    if (b) {
      b.revenue += c.revenueMinor
      b.deals += 1
    }
  }
  return {
    revenueTrend: buckets.map((b) => ({ label: b.label, value: b.revenue })),
    dealsTrend: buckets.map((b) => ({ label: b.label, value: b.deals })),
  }
}

// Pick the reporting month for the agency-wide view: the most recent month (not in
// the future) that cleared a small activity floor. Imported datasets often trail
// off with a few straggler calls in otherwise-empty recent months (e.g. a lone May
// call after March's 55) — anchoring on those makes every monthly panel look empty.
function resolveReportingMonth(callDates: Date[], now: Date): Date {
  const ACTIVITY_FLOOR = 10
  const counts = new Map<string, number>()
  for (const d of callDates) {
    const key = `${d.getFullYear()}-${d.getMonth()}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let best: { y: number; m: number } | null = null
  for (const [key, count] of counts) {
    if (count < ACTIVITY_FLOOR) continue
    const [y, m] = key.split('-').map(Number) as [number, number]
    if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth())) continue
    if (!best || y > best.y || (y === best.y && m > best.m)) best = { y, m }
  }
  return best ? new Date(best.y, best.m, 15) : now
}

// Most recent non-future month whose summed metric clears zero. Anchors a KPI on its
// latest real activity — setter logs and ad metrics trail off before the call data, so
// the latest calendar month for those sources is often empty.
function resolveActiveMonth<T>(items: T[], getDate: (t: T) => Date, getValue: (t: T) => number, now: Date): Date | null {
  const buckets = new Map<string, { y: number; m: number; total: number }>()
  for (const it of items) {
    const d = getDate(it)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const b = buckets.get(key) ?? { y: d.getFullYear(), m: d.getMonth(), total: 0 }
    b.total += getValue(it)
    buckets.set(key, b)
  }
  const best = [...buckets.values()]
    .filter((b) => !(b.y > now.getFullYear() || (b.y === now.getFullYear() && b.m > now.getMonth())))
    .filter((b) => b.total > 0)
    .sort((a, b) => (a.y !== b.y ? b.y - a.y : b.m - a.m))[0]
  return best ? new Date(best.y, best.m, 15) : null
}

// ROAS needs a month where BOTH spend and attributed revenue exist. In the imported set
// they frequently land in different months (spend one month, conversions the next), which
// would make ROAS read 0 or ∞. Prefer the most recent month with both; fall back to spend.
function resolveAdMonth(
  metrics: Array<{ date: Date; dailySpendMinor: number; revenueMinor: number }>,
  now: Date,
): Date | null {
  const buckets = new Map<string, { y: number; m: number; spend: number; rev: number }>()
  for (const x of metrics) {
    const key = `${x.date.getFullYear()}-${x.date.getMonth()}`
    const b = buckets.get(key) ?? { y: x.date.getFullYear(), m: x.date.getMonth(), spend: 0, rev: 0 }
    b.spend += x.dailySpendMinor
    b.rev += x.revenueMinor
    buckets.set(key, b)
  }
  const inPast = (b: { y: number; m: number }) =>
    !(b.y > now.getFullYear() || (b.y === now.getFullYear() && b.m > now.getMonth()))
  const sorted = [...buckets.values()].filter(inPast).sort((a, b) => (a.y !== b.y ? b.y - a.y : b.m - a.m))
  const best = sorted.find((b) => b.spend > 0 && b.rev > 0) ?? sorted.find((b) => b.spend > 0)
  return best ? new Date(best.y, best.m, 15) : null
}

router.get(
  '/master',
  requireRole(['ADMIN', 'CLOSER', 'SETTER', 'CLIENT']),
  async (req, res, next) => {
    try {
      const parsed = querySchema.safeParse(req.query)
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

      const { userId, role } = req.user!

      // Admin aggregate path — no explicit clientId: show all active clients combined
      if (role === 'ADMIN' && !parsed.data.clientId) {
        const activeClients = await prisma.client.findMany({
          where: { isActive: true },
          select: { id: true, currency: true },
        })
        const allClientIds = activeClients.map((c) => c.id)
        if (allClientIds.length === 0) return res.json({ empty: true })

        const now = new Date()

        // Pull all-time calls, setter logs & ad metrics across the portfolio once. The
        // leaderboard/setter panels aggregate the full roster from these; every KPI/trend
        // window is sliced in JS (avoids a fan-out of per-window queries).
        const [allCallsRaw, allSetterLogs, allAdMetricsRaw] = await Promise.all([
          prisma.call.findMany({
            where: { clientId: { in: allClientIds }, deletedAt: null },
            select: {
              date: true,
              outcome: true,
              revenueMinor: true,
              cashCollectedMinor: true,
              currency: true,
              closerId: true,
              closer: { select: { id: true, name: true } },
            },
          }),
          prisma.setterLog.findMany({
            where: { clientId: { in: allClientIds } },
            select: {
              date: true,
              bookedCalls: true,
              newConvos: true,
              offers: true,
              setterId: true,
              setter: { select: { name: true } },
            },
          }),
          prisma.adDailyMetric.findMany({
            where: { clientId: { in: allClientIds } },
            select: { date: true, dailySpendMinor: true, revenueMinor: true, currency: true },
          }),
        ])

        // Clients bill in their own currency (DKK/EUR/USD); the agency-wide view is
        // displayed in USD. Normalize every money amount to USD minor units up front
        // so all downstream aggregation (KPIs, sparklines, trends, leaderboard) can
        // stay single-currency. Rates come from the FxRate cache (daily fetch in prod,
        // seeded snapshot in demo); a missing rate falls back to the raw value.
        const rates = await getLatestRates('USD')
        if (Object.keys(rates).length === 0) {
          // Loud, not silent: an empty cache means convertToDisplay returns raw
          // minor units, which overstates non-USD clients (~7× for DKK). The FX
          // boot-backfill/daily job (cron) or the DB seed should populate this.
          console.error(
            '[dashboard] FX rate cache is EMPTY — non-USD amounts cannot be converted and will be overstated. Ensure the FX refresh ran (FX_API_KEY set) or the DB was seeded with rates.',
          )
        }
        const toUsdMinor = (amountMinor: number, from: string) =>
          Math.round(convertToDisplay(amountMinor, from, 'USD', rates) * 100)
        const allCalls = allCallsRaw.map((c) => ({
          ...c,
          revenueMinor: toUsdMinor(c.revenueMinor, c.currency),
          cashCollectedMinor: toUsdMinor(c.cashCollectedMinor, c.currency),
        }))
        const allAdMetrics = allAdMetricsRaw.map((m) => ({
          ...m,
          dailySpendMinor: toUsdMinor(m.dailySpendMinor, m.currency),
          revenueMinor: toUsdMinor(m.revenueMinor, m.currency),
        }))

        // Each data source is imported for a different span (calls run latest, setter logs
        // and ad metrics trail off earlier), so anchor every KPI on ITS OWN most-recent
        // month WITH real activity — otherwise cards read misleading 0s (e.g. "$130k
        // revenue / 0 booked calls / 0 ROAS"). period.ts documents this per-source intent.

        // Reporting month for call-based KPIs = most recent month with real call volume.
        const refDate = resolveReportingMonth(allCalls.map((c) => c.date), now)
        const isCurrentMonth =
          refDate.getMonth() === now.getMonth() && refDate.getFullYear() === now.getFullYear()
        const { start: curStart, end: curEnd } = currentMonthRange(refDate)
        const prevMonthDate = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1)
        const { start: prevStart, end: prevEnd } = currentMonthRange(prevMonthDate)
        const curDays = daysInMonth(refDate)
        const curElapsed = isCurrentMonth ? daysElapsed(now) : curDays

        // Booked calls anchor on the latest month with booked activity; ROAS/ad-spend on
        // the latest month that has both spend and attributed revenue (so ROAS ≠ 0/∞).
        const setterRefDate =
          resolveActiveMonth(allSetterLogs, (l) => l.date, (l) => l.bookedCalls, now) ?? now
        const { start: setterStart, end: setterEnd } = currentMonthRange(setterRefDate)
        const setterPrev = currentMonthRange(new Date(setterRefDate.getFullYear(), setterRefDate.getMonth() - 1, 1))
        const adRefDate = resolveAdMonth(allAdMetrics, now) ?? now
        const { start: adStart, end: adEnd } = currentMonthRange(adRefDate)
        const adPrev = currentMonthRange(new Date(adRefDate.getFullYear(), adRefDate.getMonth() - 1, 1))

        const goals = await prisma.goal.findMany({
          where: {
            clientId: { in: allClientIds },
            month: refDate.getMonth() + 1,
            year: refDate.getFullYear(),
            kpiKey: { in: ['revenue', 'cashCollected', 'dealsWon', 'callsTaken'] },
          },
          select: { kpiKey: true, targetMinor: true, targetValue: true, greenPct: true, amberPct: true },
        })

        // Per-source window slices from the all-time pulls.
        const inRange = (d: Date, s: Date, e: Date) => d >= s && d <= e
        const curCalls = allCalls.filter((c) => inRange(c.date, curStart, curEnd))
        const prevCalls = allCalls.filter((c) => inRange(c.date, prevStart, prevEnd))
        const curSetterLogs = allSetterLogs.filter((l) => inRange(l.date, setterStart, setterEnd))
        const prevSetterLogs = allSetterLogs.filter((l) => inRange(l.date, setterPrev.start, setterPrev.end))
        const curAdMetrics = allAdMetrics.filter((m) => inRange(m.date, adStart, adEnd))
        const prevAdMetrics = allAdMetrics.filter((m) => inRange(m.date, adPrev.start, adPrev.end))

        const currency = 'USD'
        // Single source of truth — curCalls/prevCalls are already USD-normalized above.
        const cur = computeCallKpis(curCalls)
        const prev = computeCallKpis(prevCalls)
        const curRevenue = cur.revenueMinor
        const prevRevenue = prev.revenueMinor
        const curCash = cur.cashMinor
        const prevCash = prev.cashMinor
        const curDeals = cur.dealsWon
        const prevDeals = prev.dealsWon
        const curCallsTaken = cur.callsTaken
        const prevCallsTaken = prev.callsTaken
        const curNoShows = cur.noShows
        const curBooked = curSetterLogs.reduce((s, l) => s + l.bookedCalls, 0)
        const prevBooked = prevSetterLogs.reduce((s, l) => s + l.bookedCalls, 0)
        const curAdSpend = curAdMetrics.reduce((s, m) => s + m.dailySpendMinor, 0)
        const prevAdSpend = prevAdMetrics.reduce((s, m) => s + m.dailySpendMinor, 0)
        const curAdRevenue = curAdMetrics.reduce((s, m) => s + m.revenueMinor, 0)
        const prevAdRevenue = prevAdMetrics.reduce((s, m) => s + m.revenueMinor, 0)
        const curRoas = calcRoas(curAdRevenue, curAdSpend)
        const prevRoas = calcRoas(prevAdRevenue, prevAdSpend)
        const pacingResult = calcPacing(curRevenue, 0, curElapsed, curDays)

        // Aggregate goal across clients: sum targets, average thresholds, compare to the
        // agency-wide actual. A bar renders only when a goal is configured for the
        // reporting month (admins set these per client in Settings — never hardcoded).
        function aggGoal(kpiKey: string, actual: number, isMinor: boolean) {
          const rows = goals.filter((g) => g.kpiKey === kpiKey)
          if (rows.length === 0) return undefined
          const target = rows.reduce(
            (s, g) => s + (isMinor ? (g.targetMinor ?? 0) : Number(g.targetValue ?? 0)),
            0,
          )
          if (target === 0) return undefined
          const greenPct = Math.round(rows.reduce((s, g) => s + g.greenPct, 0) / rows.length)
          const amberPct = Math.round(rows.reduce((s, g) => s + g.amberPct, 0) / rows.length)
          const { rawPct, band } = goalProgress(actual, target, greenPct, amberPct)
          return { pct: Math.round(rawPct), band }
        }

        // Daily sparklines (KPI cards on Master still show them)
        const revenueByDay = new Array<number>(curDays).fill(0)
        const cashByDay = new Array<number>(curDays).fill(0)
        const dealsByDay = new Array<number>(curDays).fill(0)
        const callsByDay = new Array<number>(curDays).fill(0)
        for (const call of curCalls) {
          const idx = new Date(call.date).getDate() - 1
          if (idx >= 0 && idx < curDays) {
            if (isWonOutcome(call.outcome)) {
              revenueByDay[idx] = (revenueByDay[idx] ?? 0) + call.revenueMinor
              cashByDay[idx] = (cashByDay[idx] ?? 0) + call.cashCollectedMinor
              dealsByDay[idx] = (dealsByDay[idx] ?? 0) + 1
            }
            if (call.outcome !== 'RESCHEDULED' && call.outcome !== 'NO_SHOW' && call.outcome !== 'CANCELLED') {
              callsByDay[idx] = (callsByDay[idx] ?? 0) + 1
            }
          }
        }
        const adSpendByDay = new Array<number>(curDays).fill(0)
        const roasByDay = new Array<number>(curDays).fill(0)
        for (const m of curAdMetrics) {
          const idx = new Date(m.date).getDate() - 1
          if (idx >= 0 && idx < curDays) {
            adSpendByDay[idx] = (adSpendByDay[idx] ?? 0) + m.dailySpendMinor
            roasByDay[idx] = m.dailySpendMinor > 0 ? m.revenueMinor / m.dailySpendMinor : 0
          }
        }
        const bookedByDay = new Array<number>(curDays).fill(0)
        for (const log of curSetterLogs) {
          const idx = new Date(log.date).getDate() - 1
          if (idx >= 0 && idx < curDays) {
            bookedByDay[idx] = (bookedByDay[idx] ?? 0) + log.bookedCalls
          }
        }
        const sl = (arr: number[]) => arr.slice(0, curElapsed)

        // Leaderboard — ALL closers across all clients (all-time roster), USD display
        const closerMap = new Map<string, { name: string; rev: number; outcomes: string[] }>()
        for (const call of allCalls) {
          if (!closerMap.has(call.closerId)) {
            closerMap.set(call.closerId, { name: call.closer.name, rev: 0, outcomes: [] })
          }
          const row = closerMap.get(call.closerId)!
          if (isWonOutcome(call.outcome)) row.rev += call.revenueMinor
          row.outcomes.push(call.outcome)
        }
        const leaderboard = [...closerMap.entries()]
          .map(([closerId, { name, rev, outcomes }]) => {
            const agg = aggregateOutcomes(outcomes as Parameters<typeof aggregateOutcomes>[0])
            return {
              closerId,
              name,
              calls: agg.conducted,
              deals: agg.closed,
              closeRate: Math.round(closeRate(agg.closed, agg.conducted) * 1000) / 10,
              showUpRate: Math.round(showUpRate(agg.conducted, agg.onCalendar) * 1000) / 10,
              revenueMinor: rev,
              currency,
            }
          })
          .filter((r) => r.calls > 0)
          .sort((a, b) => b.revenueMinor - a.revenueMinor)

        // Setter summary — ALL setters across all clients (all-time roster)
        const setterMap = new Map<
          string,
          { name: string; conversations: number; proposals: number; callsSet: number }
        >()
        for (const log of allSetterLogs) {
          if (!setterMap.has(log.setterId)) {
            setterMap.set(log.setterId, { name: log.setter.name, conversations: 0, proposals: 0, callsSet: 0 })
          }
          const row = setterMap.get(log.setterId)!
          row.conversations += log.newConvos
          row.proposals += log.offers
          row.callsSet += log.bookedCalls
        }
        const setterSummary = [...setterMap.values()]
          .filter((s) => s.callsSet > 0)
          .map((s) => ({ ...s, conversionRate: setterConversionRate(s.callsSet, s.conversations) }))
          .sort((a, b) => b.callsSet - a.callsSet)

        // 6-month revenue & deals trend — real trajectory across the data-rich window
        const { revenueTrend, dealsTrend } = buildMonthlyTrend(allCalls, refDate)

        return res.json({
          currency,
          period: {
            month: refDate.getMonth() + 1,
            year: refDate.getFullYear(),
            label: refDate.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
          },
          kpis: {
            totalRevenue: { value: curRevenue, currency, trendPct: trendPct(curRevenue, prevRevenue), sparkline: sl(revenueByDay), goal: aggGoal('revenue', curRevenue, true) },
            totalDealsWon: { value: curDeals, trendPct: trendPct(curDeals, prevDeals), sparkline: sl(dealsByDay), goal: aggGoal('dealsWon', curDeals, false) },
            bookedCalls: { value: curBooked, trendPct: trendPct(curBooked, prevBooked), sparkline: sl(bookedByDay) },
            pacing: { projectedRevenue: Math.round(pacingResult.expected), currency },
            totalCashCollected: { value: curCash, currency, trendPct: trendPct(curCash, prevCash), sparkline: sl(cashByDay), goal: aggGoal('cashCollected', curCash, true) },
            adSpend: { value: curAdSpend, currency, trendPct: trendPct(curAdSpend, prevAdSpend), sparkline: sl(adSpendByDay) },
            callsTaken: { value: curCallsTaken, trendPct: trendPct(curCallsTaken, prevCallsTaken), sparkline: sl(callsByDay), noShows: curNoShows, goal: aggGoal('callsTaken', curCallsTaken, false) },
            roas: { value: Math.round(curRoas * 100) / 100, trendPct: trendPct(curRoas, prevRoas), sparkline: sl(roasByDay) },
          },
          leaderboard,
          setterSummary,
          revenueTrend,
          dealsTrend,
        })
      }

      // Single-client path — used for non-admin roles and admin with explicit ?clientId=
      // Resolve clientId based on role — prefer clients with actual call data
      let clientId: string | undefined
      if (role === 'ADMIN') {
        clientId = parsed.data.clientId
      } else {
        // For non-admin: pick the membership whose client has the most recent call data
        const mems = await prisma.membership.findMany({
          where: { userId },
          select: { clientId: true },
        })
        const clientIds = mems.map((m) => m.clientId)
        const latestCall = await prisma.call.findFirst({
          where: { clientId: { in: clientIds }, deletedAt: null },
          orderBy: { date: 'desc' },
          select: { clientId: true },
        })
        clientId = latestCall?.clientId ?? clientIds[0]
      }

      if (!clientId) {
        return res.json({ empty: true })
      }

      // Date ranges — fall back to most recent month with data if current month is empty
      const now = new Date()
      let refDate = now

      const [mostRecentCall, mostRecentSetterLog] = await Promise.all([
        prisma.call.findFirst({
          where: { clientId, deletedAt: null },
          orderBy: { date: 'desc' },
          select: { date: true },
        }),
        prisma.setterLog.findFirst({
          where: { clientId },
          orderBy: { date: 'desc' },
          select: { date: true },
        }),
      ])

      if (mostRecentCall) {
        const d = new Date(mostRecentCall.date)
        const isBeforeCurrent =
          d.getFullYear() < now.getFullYear() ||
          (d.getFullYear() === now.getFullYear() && d.getMonth() < now.getMonth())
        if (isBeforeCurrent) refDate = d
      }

      // Setter logs may have a different date skew — use their own fallback date
      let setterRefDate = now
      if (mostRecentSetterLog) {
        const d = new Date(mostRecentSetterLog.date)
        const isBeforeCurrent =
          d.getFullYear() < now.getFullYear() ||
          (d.getFullYear() === now.getFullYear() && d.getMonth() < now.getMonth())
        if (isBeforeCurrent) setterRefDate = d
      }

      const isCurrentMonth =
        refDate.getMonth() === now.getMonth() && refDate.getFullYear() === now.getFullYear()

      const { start: curStart, end: curEnd } = currentMonthRange(refDate)
      const prevMonthDate = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1)
      const { start: prevStart, end: prevEnd } = currentMonthRange(prevMonthDate)
      const curDays = daysInMonth(refDate)
      const curElapsed = isCurrentMonth ? daysElapsed(now) : curDays

      const { start: setterCurStart, end: setterCurEnd } = currentMonthRange(setterRefDate)
      const setterPrevMonthDate = new Date(setterRefDate.getFullYear(), setterRefDate.getMonth() - 1, 1)
      const { start: setterPrevStart, end: setterPrevEnd } = currentMonthRange(setterPrevMonthDate)

      // Role-based query scoping
      const callScope = role === 'CLOSER' ? { closerId: userId } : {}
      const setterScope = role === 'SETTER' ? { setterId: userId } : {}

      // 6-month window (ending on the reporting month) for the trend charts.
      const trendStart = new Date(refDate.getFullYear(), refDate.getMonth() - 5, 1, 0, 0, 0, 0)

      const [
        client,
        curCalls,
        prevCalls,
        curSetterLogs,
        prevSetterLogs,
        curAdMetrics,
        prevAdMetrics,
        goals,
        trendCalls,
      ] = await Promise.all([
        prisma.client.findUnique({
          where: { id: clientId },
          select: { currency: true },
        }),
        prisma.call.findMany({
          where: { clientId, ...callScope, deletedAt: null, date: { gte: curStart, lte: curEnd } },
          select: {
            date: true,
            outcome: true,
            revenueMinor: true,
            cashCollectedMinor: true,
            closerId: true,
            closer: { select: { id: true, name: true } },
          },
        }),
        prisma.call.findMany({
          where: { clientId, ...callScope, deletedAt: null, date: { gte: prevStart, lte: prevEnd } },
          select: { outcome: true, revenueMinor: true, cashCollectedMinor: true },
        }),
        prisma.setterLog.findMany({
          where: { clientId, ...setterScope, date: { gte: setterCurStart, lte: setterCurEnd } },
          select: {
            date: true,
            bookedCalls: true,
            newConvos: true,
            offers: true,
            setterId: true,
            setter: { select: { name: true } },
          },
        }),
        prisma.setterLog.findMany({
          where: { clientId, ...setterScope, date: { gte: setterPrevStart, lte: setterPrevEnd } },
          select: { bookedCalls: true },
        }),
        prisma.adDailyMetric.findMany({
          where: { clientId, date: { gte: curStart, lte: curEnd } },
          select: { date: true, dailySpendMinor: true, revenueMinor: true },
        }),
        prisma.adDailyMetric.findMany({
          where: { clientId, date: { gte: prevStart, lte: prevEnd } },
          select: { dailySpendMinor: true, revenueMinor: true },
        }),
        prisma.goal.findMany({
          where: {
            clientId,
            month: refDate.getMonth() + 1,
            year: refDate.getFullYear(),
            kpiKey: {
              in: ['revenue', 'cashCollected', 'dealsWon', 'bookedCalls', 'callsTaken', 'adSpend', 'roas'],
            },
          },
          select: {
            kpiKey: true,
            targetMinor: true,
            targetValue: true,
            greenPct: true,
            amberPct: true,
          },
        }),
        prisma.call.findMany({
          where: { clientId, ...callScope, deletedAt: null, date: { gte: trendStart, lte: curEnd } },
          select: { date: true, outcome: true, revenueMinor: true },
        }),
      ])

      // All dashboard views display in USD — convert from the client's native currency.
      const clientCurrency = client?.currency ?? 'USD'
      const rates = clientCurrency !== 'USD' ? await getLatestRates('USD') : {}
      const toUsdMinor = (amt: number) =>
        Math.round(convertToDisplay(amt, clientCurrency, 'USD', rates) * 100)
      const currency = 'USD'

      // Normalize all monetary amounts to USD before any aggregation so every
      // downstream computation (KPIs, sparklines, leaderboard) stays single-currency.
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
      const curAdMetricsUsd = curAdMetrics.map((m) => ({
        ...m,
        dailySpendMinor: toUsdMinor(m.dailySpendMinor),
        revenueMinor: toUsdMinor(m.revenueMinor),
      }))
      const prevAdMetricsUsd = prevAdMetrics.map((m) => ({
        ...m,
        dailySpendMinor: toUsdMinor(m.dailySpendMinor),
        revenueMinor: toUsdMinor(m.revenueMinor),
      }))
      const trendCallsUsd = trendCalls.map((c) => ({
        ...c,
        revenueMinor: toUsdMinor(c.revenueMinor),
      }))

      // Single source of truth — same won-only formulas as Sales + aggregate Master.
      const cur = computeCallKpis(curCallsUsd)
      const prev = computeCallKpis(prevCallsUsd)
      const curRevenue = cur.revenueMinor
      const prevRevenue = prev.revenueMinor
      const curCash = cur.cashMinor
      const prevCash = prev.cashMinor
      const curDeals = cur.dealsWon
      const prevDeals = prev.dealsWon
      const curCallsTaken = cur.callsTaken
      const prevCallsTaken = prev.callsTaken
      const curNoShows = cur.noShows

      const curBooked = curSetterLogs.reduce((s, l) => s + l.bookedCalls, 0)
      const prevBooked = prevSetterLogs.reduce((s, l) => s + l.bookedCalls, 0)

      const curAdSpend = curAdMetricsUsd.reduce((s, m) => s + m.dailySpendMinor, 0)
      const prevAdSpend = prevAdMetricsUsd.reduce((s, m) => s + m.dailySpendMinor, 0)
      const curAdRevenue = curAdMetricsUsd.reduce((s, m) => s + m.revenueMinor, 0)
      const prevAdRevenue = prevAdMetricsUsd.reduce((s, m) => s + m.revenueMinor, 0)

      const curRoas = calcRoas(curAdRevenue, curAdSpend)
      const prevRoas = calcRoas(prevAdRevenue, prevAdSpend)

      // Pacing (projected revenue by month end) — both actual and target in USD.
      const revenueGoal = goals.find((g) => g.kpiKey === 'revenue')
      const revenueTarget = toUsdMinor(revenueGoal?.targetMinor ?? 0)
      const pacingResult = calcPacing(curRevenue, revenueTarget, curElapsed, curDays)

      // Daily sparkline arrays (all amounts already USD-normalized)
      const revenueByDay = new Array<number>(curDays).fill(0)
      const cashByDay = new Array<number>(curDays).fill(0)
      const dealsByDay = new Array<number>(curDays).fill(0)
      const callsByDay = new Array<number>(curDays).fill(0)

      for (const call of curCallsUsd) {
        const idx = new Date(call.date).getDate() - 1
        if (idx >= 0 && idx < curDays) {
          if (isWonOutcome(call.outcome)) {
            revenueByDay[idx] = (revenueByDay[idx] ?? 0) + call.revenueMinor
            cashByDay[idx] = (cashByDay[idx] ?? 0) + call.cashCollectedMinor
            dealsByDay[idx] = (dealsByDay[idx] ?? 0) + 1
          }
          if (
            call.outcome !== 'RESCHEDULED' &&
            call.outcome !== 'NO_SHOW' &&
            call.outcome !== 'CANCELLED'
          ) {
            callsByDay[idx] = (callsByDay[idx] ?? 0) + 1
          }
        }
      }

      const adSpendByDay = new Array<number>(curDays).fill(0)
      const roasByDay = new Array<number>(curDays).fill(0)
      for (const m of curAdMetricsUsd) {
        const idx = new Date(m.date).getDate() - 1
        if (idx >= 0 && idx < curDays) {
          adSpendByDay[idx] = (adSpendByDay[idx] ?? 0) + m.dailySpendMinor
          roasByDay[idx] = m.dailySpendMinor > 0 ? m.revenueMinor / m.dailySpendMinor : 0
        }
      }

      const bookedByDay = new Array<number>(curDays).fill(0)
      for (const log of curSetterLogs) {
        const idx = new Date(log.date).getDate() - 1
        if (idx >= 0 && idx < curDays) {
          bookedByDay[idx] = (bookedByDay[idx] ?? 0) + log.bookedCalls
        }
      }

      // Slice to days elapsed (no future zeros)
      const sl = (arr: number[]) => arr.slice(0, curElapsed)

      // Goal progress helper — actual and target both in USD for correct % comparison.
      function getGoalPct(kpiKey: string, actual: number, isMinor: boolean) {
        const g = goals.find((row) => row.kpiKey === kpiKey)
        if (!g) return undefined
        const target = isMinor ? toUsdMinor(g.targetMinor ?? 0) : Number(g.targetValue ?? 0)
        if (target === 0) return undefined
        const { pct, band } = goalProgress(actual, target, g.greenPct, g.amberPct)
        return { pct: Math.round(pct), band, target }
      }

      // Leaderboard — grouped by closer (amounts already USD-normalized)
      const closerMap = new Map<
        string,
        { name: string; rev: number; outcomes: string[] }
      >()
      for (const call of curCallsUsd) {
        if (!closerMap.has(call.closerId)) {
          closerMap.set(call.closerId, { name: call.closer.name, rev: 0, outcomes: [] })
        }
        const row = closerMap.get(call.closerId)!
        if (isWonOutcome(call.outcome)) row.rev += call.revenueMinor
        row.outcomes.push(call.outcome)
      }

      const leaderboard = [...closerMap.entries()]
        .map(([closerId, { name, rev, outcomes }]) => {
          const agg = aggregateOutcomes(outcomes as Parameters<typeof aggregateOutcomes>[0])
          return {
            closerId,
            name,
            calls: agg.conducted,
            deals: agg.closed,
            closeRate: Math.round(closeRate(agg.closed, agg.conducted) * 1000) / 10,
            showUpRate: Math.round(showUpRate(agg.conducted, agg.onCalendar) * 1000) / 10,
            revenueMinor: rev,
            currency,
          }
        })
        .sort((a, b) => b.revenueMinor - a.revenueMinor)

      // Setter summary (admin-visible)
      const setterMap = new Map<
        string,
        { name: string; conversations: number; proposals: number; callsSet: number }
      >()
      for (const log of curSetterLogs) {
        if (!setterMap.has(log.setterId)) {
          setterMap.set(log.setterId, { name: log.setter.name, conversations: 0, proposals: 0, callsSet: 0 })
        }
        const row = setterMap.get(log.setterId)!
        row.conversations += log.newConvos
        row.proposals += log.offers
        row.callsSet += log.bookedCalls
      }
      const setterSummary = [...setterMap.values()]
        .map((s) => ({ ...s, conversionRate: setterConversionRate(s.callsSet, s.conversations) }))
        .sort((a, b) => b.callsSet - a.callsSet)

      // 6-month revenue & deals trend (matches the aggregate payload shape)
      const { revenueTrend, dealsTrend } = buildMonthlyTrend(trendCallsUsd, refDate)

      return res.json({
        currency,
        period: {
          month: refDate.getMonth() + 1,
          year: refDate.getFullYear(),
          label: refDate.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
        },
        kpis: {
          totalRevenue: {
            value: curRevenue,
            currency,
            trendPct: trendPct(curRevenue, prevRevenue),
            sparkline: sl(revenueByDay),
            goal: getGoalPct('revenue', curRevenue, true),
          },
          totalDealsWon: {
            value: curDeals,
            trendPct: trendPct(curDeals, prevDeals),
            sparkline: sl(dealsByDay),
            goal: getGoalPct('dealsWon', curDeals, false),
          },
          bookedCalls: {
            value: curBooked,
            trendPct: trendPct(curBooked, prevBooked),
            sparkline: sl(bookedByDay),
            goal: getGoalPct('bookedCalls', curBooked, false),
          },
          pacing: {
            projectedRevenue: Math.round(pacingResult.expected),
            currency,
          },
          totalCashCollected: {
            value: curCash,
            currency,
            trendPct: trendPct(curCash, prevCash),
            sparkline: sl(cashByDay),
            goal: getGoalPct('cashCollected', curCash, true),
          },
          adSpend: {
            value: curAdSpend,
            currency,
            trendPct: trendPct(curAdSpend, prevAdSpend),
            sparkline: sl(adSpendByDay),
            goal: getGoalPct('adSpend', curAdSpend, true),
          },
          callsTaken: {
            value: curCallsTaken,
            trendPct: trendPct(curCallsTaken, prevCallsTaken),
            sparkline: sl(callsByDay),
            noShows: curNoShows,
            goal: getGoalPct('callsTaken', curCallsTaken, false),
          },
          roas: {
            value: Math.round(curRoas * 100) / 100,
            trendPct: trendPct(curRoas, prevRoas),
            sparkline: sl(roasByDay),
            goal: getGoalPct('roas', curRoas, false),
          },
        },
        leaderboard,
        setterSummary,
        revenueTrend,
        dealsTrend,
      })
    } catch (error) {
      next(error)
    }
  },
)

export default router
