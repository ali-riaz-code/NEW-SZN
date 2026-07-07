export interface PacingResult {
  dailyRate: number    // actual units per day so far
  expected: number     // projected total by month end at current pace
  pctOfTarget: number  // % of target achieved so far (0–100+)
  onTrack: boolean     // true when % achieved ≥ % of month elapsed
}

// Close rate = deals won / calls conducted (excludes RESCHEDULED from denominator).
// conductedCalls = closed + showed-not-closed (use aggregateOutcomes().conducted).
export function closeRate(dealsWon: number, conductedCalls: number): number {
  if (conductedCalls === 0) return 0
  return dealsWon / conductedCalls
}

// Show-up rate = calls that showed / calls that were on the calendar.
// onCalendarCalls = conducted + noShow (excludes RESCHEDULED — they're not on calendar yet).
export function showUpRate(callsShowed: number, onCalendarCalls: number): number {
  if (onCalendarCalls === 0) return 0
  return callsShowed / onCalendarCalls
}

// ROAS = revenue / ad spend. Both in the same units (minor or major — must match).
export function roas(revenueMinor: number, spendMinor: number): number {
  if (spendMinor === 0) return 0
  return revenueMinor / spendMinor
}

// Cost per unit of output (cost per call, per lead, per follower, etc.).
// spendMinor in minor units; returns minor units per unit.
export function costPerUnit(spendMinor: number, unitCount: number): number {
  if (unitCount === 0) return 0
  return spendMinor / unitCount
}

// Pacing: are we on track to hit the monthly target by month end?
// actual and target in the same units; daysElapsed ≥ 1.
export function pacing(
  actual: number,
  target: number,
  daysElapsed: number,
  daysInMonth: number,
): PacingResult {
  if (daysElapsed <= 0 || daysInMonth <= 0) {
    return { dailyRate: 0, expected: 0, pctOfTarget: 0, onTrack: false }
  }

  const dailyRate = actual / daysElapsed
  const expected = dailyRate * daysInMonth
  const pctOfTarget = target > 0 ? (actual / target) * 100 : actual > 0 ? 100 : 0
  const monthPctElapsed = (daysElapsed / daysInMonth) * 100

  return {
    dailyRate,
    expected,
    pctOfTarget,
    onTrack: pctOfTarget >= monthPctElapsed,
  }
}
