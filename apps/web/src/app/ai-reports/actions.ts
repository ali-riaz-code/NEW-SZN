'use server'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { apiSend } from '@/lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type Cadence = 'daily' | 'weekly' | 'monthly'
export type Schedule = Cadence | null

export interface ReportRow {
  id: string
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  clientId: string
  clientName: string
  periodStart: string
  periodEnd: string
  generatedAt: string
  generatedBy: string
  downloadUrl: string
}

export interface FetchReportsResult {
  rows: ReportRow[]
  total: number
  page: number
  pageSize: number
}

export interface ReportFilters {
  clientId?: string
  type?: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

async function authedGet<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  const session = await auth()
  if (!session?.user) return null
  const url = new URL(`${API_BASE}${path}`)
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  try {
    const res = await fetch(url.toString(), {
      headers: {
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET ?? '',
        'X-User-Id': session.user.userId,
        'X-User-Role': session.user.role,
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export async function fetchReportsAction(
  filters: ReportFilters,
): Promise<{ data?: FetchReportsResult; error?: string }> {
  const params: Record<string, string> = {}
  if (filters.clientId) params.clientId = filters.clientId
  if (filters.type) params.type = filters.type
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  if (filters.page) params.page = String(filters.page)
  if (filters.pageSize) params.pageSize = String(filters.pageSize)
  const data = await authedGet<FetchReportsResult>('/api/reports', params)
  if (!data) return { error: 'Could not load reports.' }
  return { data }
}

export async function generateReportAction(
  clientId: string,
  cadence: Cadence,
): Promise<{ error?: string; ok?: boolean }> {
  const res = await apiSend('POST', '/api/reports/generate', { clientId, cadence })
  if (!res.ok) return { error: res.error }
  revalidatePath('/ai-reports')
  return { ok: true }
}

export async function fetchScheduleAction(clientId: string): Promise<{ schedule: Schedule }> {
  const data = await authedGet<{ schedule: Schedule }>('/api/reports/schedule', { clientId })
  return { schedule: data?.schedule ?? null }
}

export async function saveScheduleAction(
  clientId: string,
  schedule: Schedule,
): Promise<{ error?: string; ok?: boolean }> {
  const res = await apiSend('PATCH', '/api/reports/schedule', { clientId, schedule })
  if (!res.ok) return { error: res.error }
  revalidatePath('/ai-reports')
  return { ok: true }
}
