import { CallOutcome } from '@prisma/client'
import { aggregateOutcomes, isWonOutcome } from './aggregators'
import { closeRate, showUpRate } from './rates'

// ─── Single source of truth for call-based KPIs ─────────────────────────────────
//
// Every dashboard (Sales, Master, single-client + aggregate) and AI Insights must
// derive revenue / deals / rates the SAME way, or the numbers contradict each other.
// This function is the one place those formulas live. It is currency-AGNOSTIC: the
// caller passes calls whose `revenueMinor` / `cashCollectedMinor` are already in the
// desired display units (per-client dashboards pass raw client-currency minor units;
// the agency aggregate converts to USD first), and the outputs come back in those
// same units. All won-based sums use `isWonOutcome`, so deposit-only and other
// showed-but-didn't-close outcomes never leak into Revenue / Deals Won / Close Rate.

export interface CallLike {
  outcome: CallOutcome
  revenueMinor: number
  cashCollectedMinor: number
}

export interface CallKpis {
  /** Won-deal revenue (PIF + Split Pay only), in the caller's display units. */
  revenueMinor: number
  /** Won-deal cash collected, in the caller's display units. */
  cashMinor: number
  dealsWon: number
  /** Showed but didn't close: Offer Declined + Not a Fit + Deposit + Drag-over. */
  dealsLost: number
  /** Deposit-only calls (subset of dealsLost), surfaced for the Deposits card. */
  deposits: number
  /** Calls that happened (closed + showed-not-closed); excludes no-shows + rescheduled. */
  callsTaken: number
  noShows: number
  closeRatePct: number
  showUpRatePct: number
  avgDealMinor: number
  avgCashMinor: number
  revenuePerCallMinor: number
  cashPerCallMinor: number
  cashUpfrontPct: number
  pifPct: number
}

export function computeCallKpis(calls: CallLike[]): CallKpis {
  const agg = aggregateOutcomes(calls.map((c) => c.outcome))

  const revenueMinor = calls.reduce((s, c) => s + (isWonOutcome(c.outcome) ? c.revenueMinor : 0), 0)
  const cashMinor = calls.reduce((s, c) => s + (isWonOutcome(c.outcome) ? c.cashCollectedMinor : 0), 0)
  const pifCount = calls.reduce((s, c) => s + (c.outcome === CallOutcome.CLOSED_PIF ? 1 : 0), 0)

  const dealsWon = agg.closed
  const conducted = agg.conducted

  return {
    revenueMinor,
    cashMinor,
    dealsWon,
    dealsLost: agg.showedNotClosed,
    deposits: agg.deposit,
    callsTaken: conducted,
    noShows: agg.noShow,
    closeRatePct: closeRate(dealsWon, conducted) * 100,
    showUpRatePct: showUpRate(conducted, agg.onCalendar) * 100,
    avgDealMinor: dealsWon > 0 ? Math.round(revenueMinor / dealsWon) : 0,
    avgCashMinor: dealsWon > 0 ? Math.round(cashMinor / dealsWon) : 0,
    revenuePerCallMinor: conducted > 0 ? Math.round(revenueMinor / conducted) : 0,
    cashPerCallMinor: conducted > 0 ? Math.round(cashMinor / conducted) : 0,
    cashUpfrontPct: revenueMinor > 0 ? Math.round((cashMinor / revenueMinor) * 1000) / 10 : 0,
    pifPct: dealsWon > 0 ? Math.round((pifCount / dealsWon) * 1000) / 10 : 0,
  }
}
