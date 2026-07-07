import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '@new-szn/db'
import { requireRole } from '../middleware/auth'
import { generateInsights, type DashboardKind, type Scope } from '../integrations/ai-insights'
import { generateNextBestActions } from '../integrations/next-best-action'
import { id } from '../lib/validation'
import { getAiTone } from '../lib/ai-config'

const router = Router()

// Which dashboards each role may request insights for (mirrors page access).
const DASHBOARD_ACCESS: Record<string, DashboardKind[]> = {
  ADMIN: ['master', 'sales', 'ads', 'setter'],
  CLOSER: ['master', 'sales'],
  SETTER: ['master', 'setter'],
  CLIENT: ['master', 'ads'],
}

// Resolve the client a caller acts within (mirrors the pattern in calls.ts).
async function resolveClientId(
  userId: string,
  role: string,
  requested?: string,
): Promise<string | undefined> {
  if (role === 'ADMIN') {
    if (requested) return requested
    const latest = await prisma.call.findFirst({
      where: { client: { isActive: true }, deletedAt: null },
      orderBy: { date: 'desc' },
      select: { clientId: true },
    })
    if (latest) return latest.clientId
    const first = await prisma.client.findFirst({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true },
    })
    return first?.id
  }
  const mems = await prisma.membership.findMany({ where: { userId }, select: { clientId: true } })
  const ids = mems.map((m) => m.clientId)
  if (requested && ids.includes(requested)) return requested
  return ids[0]
}

// Data-isolation scope: closers/setters restricted to their own rows.
function scopeFor(userId: string, role: string): Scope | undefined {
  if (role === 'CLOSER') return { closerId: userId }
  if (role === 'SETTER') return { setterId: userId }
  return undefined
}

// ─── POST /api/ai/insights ──────────────────────────────────────────────────────

const insightsSchema = z.object({
  clientId: id.optional(),
  dashboard: z.enum(['master', 'sales', 'ads', 'setter']),
})

router.post('/insights', requireRole(['ADMIN', 'CLOSER', 'SETTER', 'CLIENT']), async (req, res, next) => {
  try {
    const parsed = insightsSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const { userId, role } = req.user!
    const { dashboard } = parsed.data

    if (!DASHBOARD_ACCESS[role]?.includes(dashboard)) {
      return res.status(403).json({ error: 'Insights not available for this dashboard on your role.' })
    }

    const clientId = await resolveClientId(userId, role, parsed.data.clientId)
    if (!clientId) return res.json({ items: [] })

    const tone = await getAiTone(dashboard)
    const items = await generateInsights(clientId, dashboard, { scope: scopeFor(userId, role), tone })
    return res.json({ items })
  } catch (error) {
    next(error)
  }
})

// ─── POST /api/ai/next-best-action ────────────────────────────────────────────────

const nbaSchema = z.object({ clientId: id.optional() })

router.post('/next-best-action', requireRole(['ADMIN', 'CLOSER', 'SETTER']), async (req, res, next) => {
  try {
    const parsed = nbaSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const { userId, role } = req.user!

    const clientId = await resolveClientId(userId, role, parsed.data.clientId)
    if (!clientId) return res.json({ items: [] })

    const scope = role === 'CLOSER' ? { closerId: userId } : undefined
    // Next Best Action lives on the Master dashboard → 'master' personality.
    const tone = await getAiTone('master')
    const items = await generateNextBestActions(clientId, { scope, tone })
    return res.json({ items })
  } catch (error) {
    next(error)
  }
})

export default router
