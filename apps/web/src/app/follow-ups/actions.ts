'use server'
import { revalidatePath } from 'next/cache'
import { apiSend } from '@/lib/api'

export type LeadTagType =
  | 'CLOSED'
  | 'FOLLOW_UP'
  | 'HOT_FOLLOW_UP'
  | 'NO_SHOW'
  | 'DECLINED'
  | 'NOT_INTERESTED'
  | 'RESCHEDULED'

// Append a new lead tag (never overwrites — full history preserved server-side).
// Re-tagging a lead to a non-follow-up type removes it from the queue.
export async function retagLeadAction(
  callId: string,
  tagType: LeadTagType,
): Promise<{ error?: string; ok?: boolean }> {
  const res = await apiSend(`POST`, `/api/calls/${callId}/tags`, { tagType })
  if (!res.ok) return { error: res.error }
  revalidatePath('/sales')
  return { ok: true }
}
