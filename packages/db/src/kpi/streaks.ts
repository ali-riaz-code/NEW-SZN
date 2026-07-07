// Setter activity streaks — shared by the Appointment Setting dashboard and the
// Phase 9 streak-milestone Slack detector so both use one implementation.
//
// `asOf` defaults to today but is a parameter so callers (and tests / historical
// verification) can compute a streak "as of" any reference date.

export interface StreakResult {
  current: number
  best: number
  totalDays: number
  tier: string
}

export const STREAK_TIERS = [
  { min: 10, label: 'LEGENDARY' },
  { min: 7, label: 'ON FIRE' },
  { min: 4, label: 'Hot' },
  { min: 2, label: 'Warm' },
] as const

// Threshold values at which a streak crosses into a new tier (ascending).
export const STREAK_TIER_THRESHOLDS = [2, 4, 7, 10] as const

export function streakTier(current: number): string {
  for (const t of STREAK_TIERS) {
    if (current >= t.min) return t.label
  }
  return '—'
}

function dayString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Given the set of dates (YYYY-MM-DD) on which a setter was active, compute the
// current streak (consecutive days ending at `asOf` or the day before), the best
// historical streak, total active days, and the current tier label.
export function computeStreaks(activeDates: string[], asOf: Date = new Date()): StreakResult {
  const sorted = [...new Set(activeDates)].sort()

  const today = dayString(asOf)
  const yesterday = dayString(new Date(asOf.getTime() - 86400000))

  let current = 0
  let streak = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (i === sorted.length - 1) {
      if (sorted[i] === today || sorted[i] === yesterday) {
        streak = 1
      } else {
        break
      }
    } else {
      const curr = new Date(sorted[i + 1] as string)
      const prev = new Date(sorted[i] as string)
      const diff = (curr.getTime() - prev.getTime()) / 86400000
      if (diff === 1) {
        streak++
      } else {
        break
      }
    }
  }
  current = streak

  // Best streak across all dates
  let best = 0
  let runLen = sorted.length > 0 ? 1 : 0
  if (runLen > best) best = runLen
  for (let i = 1; i < sorted.length; i++) {
    const diff =
      (new Date(sorted[i] as string).getTime() - new Date(sorted[i - 1] as string).getTime()) /
      86400000
    if (diff === 1) {
      runLen++
      if (runLen > best) best = runLen
    } else {
      runLen = 1
    }
  }

  return { current, best, totalDays: sorted.length, tier: streakTier(current) }
}
