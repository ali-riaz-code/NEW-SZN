export interface DateRange {
  start: Date
  end: Date
}

// First day of the current month at 00:00:00 to last day at 23:59:59.999.
export function currentMonthRange(now = new Date()): DateRange {
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

// Today minus 27 days at 00:00:00 to today at 23:59:59.999 (28 days inclusive).
export function trailing28Days(now = new Date()): DateRange {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const start = new Date(end)
  start.setDate(start.getDate() - 27)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

// Today minus 89 days at 00:00:00 to today at 23:59:59.999 (90 days inclusive).
export function trailing90Days(now = new Date()): DateRange {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const start = new Date(end)
  start.setDate(start.getDate() - 89)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

// Total number of days in the month of the given date.
export function daysInMonth(date = new Date()): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

// Days elapsed since the 1st of the month, inclusive (e.g. on the 1st returns 1).
export function daysElapsed(date = new Date()): number {
  return Math.max(date.getDate(), 1)
}

// Format a Date as "YYYY-MM-DD" (matches FxRate.date column type).
export function toDateString(date: Date): string {
  return date.toISOString().substring(0, 10)
}
