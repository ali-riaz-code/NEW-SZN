'use server'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { apiSend } from '@/lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type LeadTagType =
  | 'CLOSED'
  | 'FOLLOW_UP'
  | 'HOT_FOLLOW_UP'
  | 'NO_SHOW'
  | 'DECLINED'
  | 'NOT_INTERESTED'
  | 'RESCHEDULED'

export interface CallLogRow {
  id: string
  date: string
  leadName: string
  leadSource: string | null
  outcome: string
  revenueMinor: number
  cashCollectedMinor: number
  currency: string
  objectionType: string | null
  closerName: string
  closerId: string
  currentTag: LeadTagType | null
  deleted: boolean
}

export interface CallLogsResp {
  rows: CallLogRow[]
  total: number
  page: number
  pageSize: number
}

export interface CallLogFilters {
  outcome?: string
  closerId?: string
  leadName?: string
  leadSource?: string
  from?: string
  to?: string
  includeDeleted?: boolean
  page?: number
  pageSize?: number
}

// Fresh (no-store) filtered fetch of the call log for interactive filtering.
export async function fetchCallLogsAction(
  filters: CallLogFilters,
): Promise<{ data?: CallLogsResp; error?: string }> {
  const session = await auth()
  if (!session?.user) return { error: 'Not authenticated.' }

  const url = new URL(`${API_BASE}/api/calls`)
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === '' || v === false) continue
    url.searchParams.set(k, String(v))
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET ?? '',
        'X-User-Id': session.user.userId,
        'X-User-Role': session.user.role,
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string }
      return { error: b.error ?? `Request failed (${res.status}).` }
    }
    return { data: (await res.json()) as CallLogsResp }
  } catch {
    return { error: 'Could not reach the API.' }
  }
}

export async function tagCallAction(
  callId: string,
  tagType: LeadTagType,
): Promise<{ error?: string; ok?: boolean }> {
  const res = await apiSend('POST', `/api/calls/${callId}/tags`, { tagType })
  if (!res.ok) return { error: res.error }
  // No revalidatePath — caller manages state optimistically
  return { ok: true }
}

export async function deleteCallAction(callId: string): Promise<{ error?: string; ok?: boolean }> {
  const res = await apiSend('DELETE', `/api/calls/${callId}`)
  if (!res.ok) return { error: res.error }
  revalidatePath('/call-logs')
  return { ok: true }
}

export async function restoreCallAction(callId: string): Promise<{ error?: string; ok?: boolean }> {
  const res = await apiSend('POST', `/api/calls/${callId}/restore`)
  if (!res.ok) return { error: res.error }
  revalidatePath('/call-logs')
  return { ok: true }
}

export async function reassignCallAction(
  callId: string,
  closerId: string,
): Promise<{ error?: string; ok?: boolean }> {
  const res = await apiSend('PATCH', `/api/calls/${callId}/reassign`, { closerId })
  if (!res.ok) return { error: res.error }
  revalidatePath('/call-logs')
  return { ok: true }
}
