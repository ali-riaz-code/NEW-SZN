'use server'
import { auth } from '@/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { apiSend } from '@/lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Currency has no assumed decimal count, but our inputs are entered in major
// units (e.g. kroner/dollars) and stored as minor units. All supported
// currencies (DKK/USD/EUR/GBP) use 2 decimal places.
function toMinor(major: string): number {
  const n = parseFloat(major)
  if (isNaN(n) || n < 0) return 0
  return Math.round(n * 100)
}

export async function logCallAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean } | null> {
  const session = await auth()
  if (!session?.user) return { error: 'Not authenticated.' }

  const clientId = (formData.get('clientId') as string) || ''
  const date = (formData.get('date') as string) || ''
  const leadName = ((formData.get('leadName') as string) || '').trim()
  const outcome = (formData.get('outcome') as string) || ''

  if (!clientId || !date || !leadName || !outcome) {
    return { error: 'Lead name, date, and outcome are required.' }
  }

  const objectionRaw = (formData.get('objectionType') as string) || ''

  const body: Record<string, unknown> = {
    clientId,
    date,
    leadName,
    outcome,
    revenueMinor: toMinor((formData.get('revenue') as string) || '0'),
    cashCollectedMinor: toMinor((formData.get('cashCollected') as string) || '0'),
    leadPhone: ((formData.get('leadPhone') as string) || '').trim() || undefined,
    leadEmail: ((formData.get('leadEmail') as string) || '').trim() || undefined,
    leadSource: ((formData.get('leadSource') as string) || '').trim() || undefined,
    objectionType: objectionRaw || undefined,
    objectionNotes: ((formData.get('objectionNotes') as string) || '').trim() || undefined,
    followUpNotes: ((formData.get('followUpNotes') as string) || '').trim() || undefined,
    callSummary: ((formData.get('callSummary') as string) || '').trim() || undefined,
  }

  const res = await fetch(`${API_BASE}/api/calls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': process.env.INTERNAL_API_SECRET ?? '',
      'X-User-Id': session.user.userId,
      'X-User-Role': session.user.role,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const b = await res.json().catch(() => ({}))
    return { error: (b as { error?: string }).error ?? 'Failed to log call.' }
  }

  revalidateTag('/api/sales/metrics')
  revalidateTag('/api/dashboard/master')
  revalidateTag('/api/call-logs')
  revalidateTag('/api/follow-ups')
  revalidatePath('/sales')
  revalidatePath('/')
  revalidatePath('/call-logs')
  revalidatePath('/follow-ups')
  return { success: true }
}

export async function reassignLeadAction(
  callId: string,
  closerId: string,
): Promise<{ error?: string; ok?: boolean }> {
  const res = await apiSend('PATCH', `/api/calls/${callId}/reassign`, { closerId })
  if (!res.ok) return { error: res.error }
  revalidatePath('/sales')
  return { ok: true }
}
