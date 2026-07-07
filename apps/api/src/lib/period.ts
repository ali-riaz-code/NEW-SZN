// Shared date/period helpers for the AI features. These resolve reporting
// windows anchored to the most recent day that actually has data — the imported
// dataset's "current" month/day is often empty, so anchoring on real data keeps
// insights/targets meaningful. (Data helpers only — no prompt logic lives here.)

import { prisma } from '@new-szn/db'
import { currentMonthRange, daysInMonth, daysElapsed } from '@new-szn/db/kpi'

export async function mostRecentCallDate(clientId: string): Promise<Date | null> {
  const row = await prisma.call.findFirst({
    where: { clientId, deletedAt: null },
    orderBy: { date: 'desc' },
    select: { date: true },
  })
  return row?.date ?? null
}

export async function mostRecentAdDate(clientId: string): Promise<Date | null> {
  const row = await prisma.adDailyMetric.findFirst({
    where: { clientId },
    orderBy: { date: 'desc' },
    select: { date: true },
  })
  return row?.date ?? null
}

export async function mostRecentSetterDate(clientId: string): Promise<Date | null> {
  const row = await prisma.setterLog.findFirst({
    where: { clientId },
    orderBy: { date: 'desc' },
    select: { date: true },
  })
  return row?.date ?? null
}

export interface MonthRange {
  start: Date
  end: Date
  monthLabel: string // e.g. "March 2026"
}

// Full-month range containing `anchor`, with a human label. Null if anchor null.
export function monthRangeFor(anchor: Date | null): MonthRange | null {
  if (!anchor) return null
  const { start, end } = currentMonthRange(anchor)
  const monthLabel = anchor.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return { start, end, monthLabel }
}

// Convenience: the month range anchored on the client's most recent call data.
export async function resolveMonthRange(clientId: string): Promise<MonthRange | null> {
  return monthRangeFor(await mostRecentCallDate(clientId))
}

// ─── Dashboard reporting window ─────────────────────────────────────────────────
// The Master dashboard already falls back to the most recent month that actually
// has data when the current month is empty (imported datasets frequently have no
// current-month rows). These helpers factor that behavior out so the Sales, Setter
// and Ads dashboards resolve their reporting window the same way — each anchored on
// its OWN most-recent data date (calls / setter logs / ad metrics respectively).

// If `mostRecent` falls in a month before the current one, anchor the window to
// that month; otherwise stay on the current month. Backward-compatible: when the
// current month has data, `refDate === now` and nothing changes.
export function anchorRefDate(mostRecent: Date | null, now: Date = new Date()): Date {
  if (!mostRecent) return now
  const d = new Date(mostRecent)
  const isBeforeCurrent =
    d.getFullYear() < now.getFullYear() ||
    (d.getFullYear() === now.getFullYear() && d.getMonth() < now.getMonth())
  return isBeforeCurrent ? d : now
}

export interface DashboardPeriod {
  refDate: Date
  isCurrentMonth: boolean
  curStart: Date
  curEnd: Date
  prevStart: Date
  prevEnd: Date
  curDays: number
  curElapsed: number
  /** Reporting month/year for goal lookups (1-based month). */
  month: number
  year: number
  /** End of the reporting window: true "now" in the current month, else month end. */
  refEnd: Date
}

// Resolve every date value a dashboard needs from a single ref date.
export function dashboardPeriod(refDate: Date, now: Date = new Date()): DashboardPeriod {
  const isCurrentMonth =
    refDate.getMonth() === now.getMonth() && refDate.getFullYear() === now.getFullYear()
  const { start: curStart, end: curEnd } = currentMonthRange(refDate)
  const prevMonthDate = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1)
  const { start: prevStart, end: prevEnd } = currentMonthRange(prevMonthDate)
  const curDays = daysInMonth(refDate)
  const curElapsed = isCurrentMonth ? daysElapsed(now) : curDays
  const refEnd = isCurrentMonth ? now : curEnd
  return {
    refDate,
    isCurrentMonth,
    curStart,
    curEnd,
    prevStart,
    prevEnd,
    curDays,
    curElapsed,
    month: refDate.getMonth() + 1,
    year: refDate.getFullYear(),
    refEnd,
  }
}
