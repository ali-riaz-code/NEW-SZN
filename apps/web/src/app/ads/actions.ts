'use server'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

function headers(session: { user: { userId: string; role: string } }) {
  return {
    'Content-Type': 'application/json',
    'X-Internal-Secret': process.env.INTERNAL_API_SECRET ?? '',
    'X-User-Id': session.user.userId,
    'X-User-Role': session.user.role,
  }
}

export async function syncAdsAction(
  _prev: { error?: string; success?: boolean; cooldownRemainingMs?: number; narrative?: string | null } | null,
  clientId?: string,
): Promise<{ error?: string; success?: boolean; cooldownRemainingMs?: number; narrative?: string | null }> {
  const session = await auth()
  if (!session?.user) return { error: 'Not authenticated.' }
  if (session.user.role !== 'ADMIN') return { error: 'Only admins can sync ads.' }

  const res = await fetch(`${API_BASE}/api/ads/sync`, {
    method: 'POST',
    headers: headers(session),
    body: JSON.stringify(clientId ? { clientId } : {}),
  })

  if (res.status === 429) {
    const b = await res.json().catch(() => ({}))
    return { error: 'Sync is on cooldown.', cooldownRemainingMs: (b as { cooldownRemainingMs?: number }).cooldownRemainingMs }
  }
  if (!res.ok) {
    const b = await res.json().catch(() => ({}))
    return { error: (b as { error?: string }).error ?? 'Sync failed.' }
  }

  const b = await res.json().catch(() => ({})) as { narrative?: string | null }
  revalidatePath('/ads')
  return { success: true, narrative: b.narrative ?? null }
}

export async function flagCampaignAction(
  campaignId: string,
  flagged: boolean,
  reason: string,
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session?.user) return { error: 'Not authenticated.' }
  if (session.user.role !== 'ADMIN') return { error: 'Only admins can flag campaigns.' }

  const res = await fetch(`${API_BASE}/api/ads/campaigns/${campaignId}/flag`, {
    method: 'PATCH',
    headers: headers(session),
    body: JSON.stringify({ flagged, reason: reason || undefined }),
  })

  if (!res.ok) {
    const b = await res.json().catch(() => ({}))
    return { error: (b as { error?: string }).error ?? 'Failed to update flag.' }
  }

  revalidatePath('/ads')
  return { success: true }
}

export async function updateCampaignTypeAction(
  campaignId: string,
  adType: 'TYPEFORM' | 'NORMAL',
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session?.user) return { error: 'Not authenticated.' }
  if (session.user.role !== 'ADMIN') return { error: 'Only admins can update campaign type.' }

  const res = await fetch(`${API_BASE}/api/ads/campaigns/${campaignId}/type`, {
    method: 'PATCH',
    headers: headers(session),
    body: JSON.stringify({ adType }),
  })

  if (!res.ok) {
    const b = await res.json().catch(() => ({}))
    return { error: (b as { error?: string }).error ?? 'Failed to update campaign type.' }
  }

  revalidatePath('/ads')
  return { success: true }
}

export async function fetchDailySpendAction(
  from: string,
  to: string,
  clientId?: string,
): Promise<{ points?: Array<{ date: string; spendMinor: number }>; error?: string }> {
  const session = await auth()
  if (!session?.user) return { error: 'Not authenticated.' }

  const url = new URL(`${API_BASE}/api/ads/daily-spend`)
  url.searchParams.set('from', from)
  url.searchParams.set('to', to)
  if (clientId) url.searchParams.set('clientId', clientId)

  try {
    const res = await fetch(url.toString(), {
      headers: headers(session),
      cache: 'no-store',
    })
    if (!res.ok) return { error: 'Failed to fetch spend data.' }
    const data = await res.json() as { points?: Array<{ date: string; spendMinor: number }> }
    return { points: data.points ?? [] }
  } catch {
    return { error: 'Could not reach the API.' }
  }
}
