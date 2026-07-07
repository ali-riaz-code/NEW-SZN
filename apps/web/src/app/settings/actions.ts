'use server'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { apiSend } from '@/lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type Role = 'ADMIN' | 'CLOSER' | 'SETTER' | 'CLIENT'
export type Dashboard = 'master' | 'sales' | 'ads' | 'setter'

export interface ClientRow {
  id: string
  name: string
  currency: string
  timezone: string
  isActive: boolean
  metaAdAccountId: string | null
  anomalyWarningPct: number
  anomalyCriticalPct: number
  closeRateAnomalyWarningPct: number
  closeRateAnomalyCriticalPct: number
  bigDealThresholdMinor: number
}
export interface UserRow {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
  slackUserId: string | null
  clientIds: string[]
}
export interface GoalRow {
  kpiKey: string
  targetMinor: number | null
  targetValue: number | null
  currency: string | null
  greenPct: number
  amberPct: number
}
export interface AiConfigRow {
  dashboard: Dashboard
  tone: string
}
export interface SlackSettingsRow {
  overallChannelId: string | null
  leaderboardEnabled: boolean
  milestoneEnabled: boolean
  streakMilestoneEnabled: boolean
  bigDealEnabled: boolean
  lossDebriefEnabled: boolean
  alertsEnabled: boolean
  dailyTargetsEnabled: boolean
}

// Fresh authed GET for settings reads (no cache; reflects mutations immediately).
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

// ── Users ──────────────────────────────────────────────────────────────────────
export async function inviteUserAction(input: {
  email: string
  name: string
  role: Role
  clientIds: string[]
}): Promise<{ error?: string; ok?: boolean }> {
  const res = await apiSend('POST', '/api/admin/users/invite', input)
  if (!res.ok) return { error: res.error }
  revalidatePath('/settings')
  return { ok: true }
}

export async function updateUserAction(
  id: string,
  patch: Partial<{ name: string; role: Role; isActive: boolean; slackUserId: string | null; clientIds: string[] }>,
): Promise<{ error?: string; ok?: boolean }> {
  const res = await apiSend('PATCH', `/api/settings/users/${id}`, patch)
  if (!res.ok) return { error: res.error }
  revalidatePath('/settings')
  return { ok: true }
}

export async function deleteUserAction(id: string): Promise<{ error?: string; ok?: boolean }> {
  const res = await apiSend('DELETE', `/api/settings/users/${id}`)
  if (!res.ok) return { error: res.error }
  revalidatePath('/settings')
  return { ok: true }
}

// ── Clients ──────────────────────────────────────────────────────────────────
export async function createClientAction(input: {
  name: string
  currency: string
  timezone?: string
  metaAdAccountId?: string | null
}): Promise<{ error?: string; ok?: boolean }> {
  const res = await apiSend('POST', '/api/settings/clients', input)
  if (!res.ok) return { error: res.error }
  revalidatePath('/settings')
  return { ok: true }
}

export async function updateClientAction(
  id: string,
  patch: Partial<{
    name: string
    currency: string
    timezone: string
    isActive: boolean
    metaAdAccountId: string | null
    anomalyWarningPct: number
    anomalyCriticalPct: number
    closeRateAnomalyWarningPct: number
    closeRateAnomalyCriticalPct: number
    bigDealThresholdMinor: number
  }>,
): Promise<{ error?: string; ok?: boolean }> {
  const res = await apiSend('PATCH', `/api/settings/clients/${id}`, patch)
  if (!res.ok) return { error: res.error }
  revalidatePath('/settings')
  return { ok: true }
}

// ── Goals ────────────────────────────────────────────────────────────────────
export async function fetchGoalsAction(
  clientId: string,
  month: number,
  year: number,
): Promise<{ goals: GoalRow[] }> {
  const data = await authedGet<{ goals: GoalRow[] }>('/api/settings/goals', {
    clientId,
    month: String(month),
    year: String(year),
  })
  return data ?? { goals: [] }
}

export async function upsertGoalAction(input: {
  clientId: string
  kpiKey: string
  month: number
  year: number
  targetMinor?: number | null
  targetValue?: number | null
  greenPct: number
  amberPct: number
}): Promise<{ error?: string; ok?: boolean }> {
  const res = await apiSend('PUT', '/api/settings/goals', input)
  if (!res.ok) return { error: res.error }
  revalidatePath('/settings')
  return { ok: true }
}

// ── Slack (global — one bot, one overall channel, app-wide toggles) ───────────
export async function fetchSlackAction(): Promise<{ config: SlackSettingsRow | null; botConnected: boolean }> {
  const data = await authedGet<{ config: SlackSettingsRow | null; botConnected: boolean }>('/api/settings/slack')
  return data ?? { config: null, botConnected: false }
}

export async function upsertSlackAction(
  input: Partial<SlackSettingsRow>,
): Promise<{ error?: string; ok?: boolean }> {
  const res = await apiSend('PUT', '/api/settings/slack', input)
  if (!res.ok) return { error: res.error }
  revalidatePath('/settings')
  return { ok: true }
}

// ── AI personality (agency-wide, per dashboard) ────────────────────────────────
export async function fetchAiConfigAction(): Promise<{ configs: AiConfigRow[] }> {
  const data = await authedGet<{ configs: AiConfigRow[] }>('/api/settings/ai-config')
  return data ?? { configs: [] }
}

export async function upsertAiConfigAction(input: {
  dashboard: Dashboard
  tone: string
}): Promise<{ error?: string; ok?: boolean }> {
  const res = await apiSend('PUT', '/api/settings/ai-config', input)
  if (!res.ok) return { error: res.error }
  revalidatePath('/settings')
  return { ok: true }
}
