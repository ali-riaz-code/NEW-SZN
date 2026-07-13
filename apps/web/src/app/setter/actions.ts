'use server'
import { auth } from '@/auth'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function logDayAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean } | null> {
  const session = await auth()
  if (!session?.user) return { error: 'Not authenticated.' }

  const clientId = formData.get('clientId') as string
  const date = formData.get('date') as string
  const newConvos = parseInt(formData.get('newConvos') as string, 10)
  const responses = parseInt(formData.get('responses') as string, 10)
  const offers = parseInt(formData.get('offers') as string, 10)
  const bookedCalls = parseInt(formData.get('bookedCalls') as string, 10)
  const followUps = parseInt(formData.get('followUps') as string, 10)
  const followerCountRaw = formData.get('followerCount') as string

  if (!clientId || !date) return { error: 'Missing required fields.' }
  if ([newConvos, responses, offers, bookedCalls, followUps].some(isNaN)) {
    return { error: 'All counts must be valid numbers.' }
  }

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  const res = await fetch(`${API_BASE}/api/setter/log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': process.env.INTERNAL_API_SECRET ?? '',
      'X-User-Id': session.user.userId,
      'X-User-Role': session.user.role,
    },
    body: JSON.stringify({
      clientId,
      date,
      newConvos,
      responses,
      offers,
      bookedCalls,
      followUps,
      followUpOffers: 0,
      followUpBookedCalls: 0,
      followerCount: followerCountRaw ? parseInt(followerCountRaw, 10) : undefined,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { error: (body as { error?: string }).error ?? 'Failed to log day.' }
  }

  revalidateTag('/api/setter/metrics')
  revalidatePath('/setter')
  revalidatePath('/') // setter activity feeds Master booked-calls
  return { success: true }
}
