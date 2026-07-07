export type GoalBand = 'green' | 'amber' | 'red'

export interface GoalProgressResult {
  pct: number    // 0–100, capped — use as progress-bar width
  rawPct: number // actual percentage, may exceed 100 when goal is surpassed
  band: GoalBand
}

// Compute goal progress and colour band.
//
// actual and target must be in the same units.
// greenPct and amberPct come from the Goal row in the DB — never hardcode them here.
// Default DB values are greenPct=75, amberPct=50 but each goal row can override them.
export function goalProgress(
  actual: number,
  target: number,
  greenPct: number,
  amberPct: number,
): GoalProgressResult {
  if (target === 0) {
    const band: GoalBand = actual > 0 ? 'green' : 'red'
    return { pct: actual > 0 ? 100 : 0, rawPct: actual > 0 ? 100 : 0, band }
  }

  const rawPct = (actual / target) * 100
  const pct = Math.min(rawPct, 100)
  const band: GoalBand = rawPct >= greenPct ? 'green' : rawPct >= amberPct ? 'amber' : 'red'

  return { pct, rawPct, band }
}
