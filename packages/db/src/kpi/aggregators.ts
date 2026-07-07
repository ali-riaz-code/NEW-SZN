import { CallOutcome, ObjectionType } from '@prisma/client'

// A "won" deal per the KPI spec: money committed. Deposit-only is intentionally
// NOT here — a deposit is a partial commitment, counted as showed-but-didn't-close.
// (See kpi_calculations.md → "The four call-outcome buckets".)
export function isWonOutcome(outcome: CallOutcome): boolean {
  return outcome === CallOutcome.CLOSED_PIF || outcome === CallOutcome.CLOSED_SPLIT_PAY
}

export interface OutcomeAggregation {
  closed: number          // CLOSED_PIF | CLOSED_SPLIT_PAY  (won deals)
  deposit: number         // CLOSED_DEPOSIT — showed but didn't close (tracked separately)
  showedNotClosed: number // OFFER_DECLINED | NOT_A_FIT | DRAG_OVER_SHOW | CLOSED_DEPOSIT
  noShow: number          // NO_SHOW | CANCELLED
  excluded: number        // RESCHEDULED — excluded from all rate denominators
  total: number           // all rows
  conducted: number       // closed + showedNotClosed — denominator for close rate
  onCalendar: number      // conducted + noShow — denominator for show-up rate
}

// Aggregate call outcomes into buckets used by close rate and show-up rate calculations.
export function aggregateOutcomes(outcomes: CallOutcome[]): OutcomeAggregation {
  let closed = 0
  let deposit = 0
  let showedNotClosed = 0
  let noShow = 0
  let excluded = 0

  for (const outcome of outcomes) {
    switch (outcome) {
      case CallOutcome.CLOSED_PIF:
      case CallOutcome.CLOSED_SPLIT_PAY:
        closed++
        break
      case CallOutcome.CLOSED_DEPOSIT:
        // Deposit-only: prospect showed but did not buy in full. Counts toward
        // the showed-up totals, never toward won deals / close rate.
        deposit++
        showedNotClosed++
        break
      case CallOutcome.OFFER_DECLINED:
      case CallOutcome.NOT_A_FIT:
      case CallOutcome.DRAG_OVER_SHOW:
        showedNotClosed++
        break
      case CallOutcome.NO_SHOW:
      case CallOutcome.CANCELLED:
        noShow++
        break
      case CallOutcome.RESCHEDULED:
        excluded++
        break
    }
  }

  return {
    closed,
    deposit,
    showedNotClosed,
    noShow,
    excluded,
    total: outcomes.length,
    conducted: closed + showedNotClosed,
    onCalendar: closed + showedNotClosed + noShow,
  }
}

// Count objections by type. Null/undefined objections are ignored.
export function aggregateObjections(
  objections: (ObjectionType | null | undefined)[],
): Record<ObjectionType, number> {
  const counts: Record<ObjectionType, number> = {
    [ObjectionType.THINK_ABOUT_IT]: 0,
    [ObjectionType.MONEY]: 0,
    [ObjectionType.TIME]: 0,
    [ObjectionType.PARTNER]: 0,
    [ObjectionType.FEAR]: 0,
    [ObjectionType.VALUE]: 0,
  }
  for (const o of objections) {
    if (o != null) counts[o]++
  }
  return counts
}
