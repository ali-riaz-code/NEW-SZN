import { auth } from '../auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? ''

export async function apiGet<T = unknown>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthenticated')

  const url = new URL(`${API_BASE}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString(), {
    headers: {
      'X-Internal-Secret': INTERNAL_SECRET,
      'X-User-Id': session.user.userId,
      'X-User-Role': session.user.role,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// Mutation helper for server actions (POST/PATCH/PUT/DELETE). Never caches.
// Returns a discriminated result so callers can surface friendly errors.
export async function apiSend<T = unknown>(
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: 'Unauthenticated', status: 401 }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_SECRET,
        'X-User-Id': session.user.userId,
        'X-User-Role': session.user.role,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: unknown }
      const msg =
        typeof b.error === 'string' ? b.error : `Request failed (${res.status}).`
      return { ok: false, error: msg, status: res.status }
    }
    const data = (await res.json().catch(() => ({}))) as T
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Could not reach the API.', status: 0 }
  }
}
