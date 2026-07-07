'use server'
import { auth } from '@/auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type Dashboard = 'master' | 'sales' | 'ads' | 'setter'

function headers(session: { user: { userId: string; role: string } }) {
  return {
    'Content-Type': 'application/json',
    'X-Internal-Secret': process.env.INTERNAL_API_SECRET ?? '',
    'X-User-Id': session.user.userId,
    'X-User-Role': session.user.role,
  }
}

async function postAi(
  path: string,
  body: Record<string, unknown>,
): Promise<{ items?: string[]; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user) return { error: 'Not authenticated.' }

    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: headers(session),
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string }
      return { error: b.error ?? `Request failed (${res.status}).` }
    }
    const data = (await res.json()) as { items?: string[] }
    return { items: data.items ?? [] }
  } catch {
    return { error: 'Could not reach the AI service.' }
  }
}

export async function getInsightsAction(
  dashboard: Dashboard,
  clientId?: string,
): Promise<{ items?: string[]; error?: string }> {
  return postAi('/api/ai/insights', { dashboard, ...(clientId ? { clientId } : {}) })
}

export async function getNextBestActionAction(): Promise<{ items?: string[]; error?: string }> {
  return postAi('/api/ai/next-best-action', {})
}
