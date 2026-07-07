// Loss Debrief — auto-triggered when a closer logs a lost call (OFFER_DECLINED or
// NOT_A_FIT). Produces an AI root-cause analysis and DMs it directly to the
// closer who logged the call. See docs/ai-features.md.
//
// Fire-and-forget: this must never block or fail the call-logging request. Callers
// invoke it without awaiting; all errors are swallowed and logged.

import { prisma } from '@new-szn/db'
import { chatComplete, isAiConfigured } from './openai'
import { sendLossDebrief } from './slack'
import { getAiTone } from '../lib/ai-config'

const LOSS_OUTCOMES = new Set(['OFFER_DECLINED', 'NOT_A_FIT'])

export function isLossOutcome(outcome: string): boolean {
  return LOSS_OUTCOMES.has(outcome)
}

// Kick off a debrief for a just-logged call. Safe to call for any outcome — it
// no-ops for non-loss outcomes. Does not throw.
export function maybeTriggerLossDebrief(callId: string): void {
  void runLossDebrief(callId).catch((err) => {
    console.error('[loss-debrief] failed', err)
  })
}

// Exported for verification; the trigger above wraps it fire-and-forget.
export async function runLossDebrief(callId: string): Promise<void> {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: {
      closer: { select: { id: true, name: true } },
      client: { select: { name: true } },
    },
  })
  if (!call || !isLossOutcome(call.outcome)) return

  let analysis: string
  if (isAiConfigured()) {
    // Loss Debrief is a Sales & Closing feature → 'sales' personality (Phase 11).
    const tone = await getAiTone('sales')
    analysis = await chatComplete(
      [
        {
          role: 'system',
          content:
            'You are a sales coach for a high-ticket closing team. A call was lost. ' +
            'In 3–4 sentences, give a specific, actionable root-cause analysis and one ' +
            'concrete thing the closer should do differently next time. Be direct and ' +
            'constructive, not generic. Do not use markdown headers.' +
            (tone ? ` Adopt this tone: ${tone}.` : ''),
        },
        {
          role: 'user',
          content: [
            `Outcome: ${call.outcome.replace(/_/g, ' ')}`,
            `Objection: ${call.objectionType ?? 'none recorded'}`,
            `Objection notes: ${call.objectionNotes ?? 'none'}`,
            `Call summary: ${call.callSummary ?? 'none'}`,
            `Follow-up notes: ${call.followUpNotes ?? 'none'}`,
          ].join('\n'),
        },
      ],
      { temperature: 0.5, maxTokens: 250 },
    )
  } else {
    analysis =
      `Automated debrief unavailable (AI not configured). Outcome ${call.outcome.replace(/_/g, ' ')}` +
      `${call.objectionType ? ` with a ${call.objectionType.replace(/_/g, ' ')} objection` : ''}. ` +
      'Review the recording and objection handling.'
  }

  await sendLossDebrief(call.closer.id, {
    closerName: call.closer.name,
    leadName: call.leadName,
    outcome: call.outcome,
    objectionType: call.objectionType,
    analysis,
  })
}
