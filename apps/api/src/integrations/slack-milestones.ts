// Phase 9 — milestone detectors. Two DISTINCT behaviours, no shared logic:
//   • Big-deal celebration — a single closed call above a per-client threshold.
//   • Streak milestone      — a setter crosses a consecutive-day activity tier.
//
// Both are fire-and-forget (like Loss Debrief): callers do not await them, and
// they swallow all errors so they can never break a request path.

import { prisma } from '@new-szn/db'
import { computeStreaks, STREAK_TIER_THRESHOLDS } from '@new-szn/db/kpi'
import { sendBigDealCelebration, sendStreakMilestone } from './slack'

// ─── Big-deal celebration ───────────────────────────────────────────────────────

const CLOSED_OUTCOMES = new Set(['CLOSED_PIF', 'CLOSED_SPLIT_PAY', 'CLOSED_DEPOSIT'])

// Kick off a celebration for a just-logged call. No-ops unless the call is a
// closed deal at or above the client's configured big-deal threshold.
export function maybeCelebrateBigDeal(callId: string): void {
  void celebrateBigDeal(callId).catch((err) => console.error('[big-deal] failed', err))
}

// Awaitable core. Returns true if a celebration was actually posted.
export async function celebrateBigDeal(callId: string): Promise<boolean> {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { closer: { select: { name: true } }, client: { select: { bigDealThresholdMinor: true } } },
  })
  if (!call || !CLOSED_OUTCOMES.has(call.outcome)) return false
  if (call.revenueMinor < call.client.bigDealThresholdMinor) return false

  return sendBigDealCelebration({
    closerName: call.closer.name,
    leadName: call.leadName,
    amountMinor: call.revenueMinor,
    currency: call.currency,
  })
}

// ─── Streak milestone ─────────────────────────────────────────────────────────

// A tier boundary — only fire the instant a streak reaches one, not on every day
// of the run (avoids repeated pings). `asOf` is a parameter so historical
// verification can run "as of" a date where imported data has a real streak.
function isTierBoundary(streak: number): boolean {
  return (STREAK_TIER_THRESHOLDS as readonly number[]).includes(streak)
}

export function maybeSendStreakMilestone(setterId: string, clientId: string, asOf?: Date): void {
  void evaluateStreakMilestone(setterId, clientId, asOf).catch((err) =>
    console.error('[streak] failed', err),
  )
}

// Awaitable core. Returns true if a streak milestone was actually posted.
export async function evaluateStreakMilestone(
  setterId: string,
  clientId: string,
  asOf: Date = new Date(),
): Promise<boolean> {
  // UTC-day based so it stays consistent with computeStreaks (which compares
  // toISOString day strings) and with the UTC-midnight dates from the importer.
  const asOfDay = asOf.toISOString().slice(0, 10)
  const cutoff = new Date(`${asOfDay}T23:59:59.999Z`)
  const logs = await prisma.setterLog.findMany({
    where: { setterId, clientId, date: { lte: cutoff } },
    select: { date: true },
  })
  if (logs.length === 0) return false

  const dates = logs
    .map((l) => l.date.toISOString().slice(0, 10))
    .filter((d) => d <= asOfDay)
  const { current, tier } = computeStreaks(dates, asOf)
  if (!isTierBoundary(current)) return false

  const setter = await prisma.user.findUnique({ where: { id: setterId }, select: { name: true } })
  if (!setter) return false

  return sendStreakMilestone({ setterName: setter.name, streak: current, tier })
}
