// Personal follow-up queues (Phase 11) — closers + admin only.
//
// A lead is "in the queue" when its CURRENT lead tag (the most recent LeadTag row
// for the call) is a follow-up type. Closers see only their own calls; admins see
// the whole resolved client (client selector honored). Setters are intentionally
// excluded: Call rows carry closerId, not setterId, so there is no per-lead setter
// pipeline in the schema (setter follow-ups live as aggregate counts on /setter).
//
// Role gating is in requireRole (Locked Decision #9); the closer own-rows filter
// below is data-scoping, matching the pattern in calls.ts.

import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '@new-szn/db'
import type { LeadTagType } from '@new-szn/db'
import { getLatestRates, convertToDisplay } from '@new-szn/db/kpi'
import { requireRole } from '../middleware/auth'
import { id } from '../lib/validation'
import { resolveClientId } from './calls'

const router = Router()

// The tag types that constitute an open follow-up pipeline item.
const FOLLOWUP_TAGS: LeadTagType[] = ['FOLLOW_UP', 'HOT_FOLLOW_UP']

const querySchema = z.object({ clientId: id.optional() })

// GET /api/follow-ups — calls whose current tag is a follow-up type.
router.get('/', requireRole(['ADMIN', 'CLOSER']), async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const { userId, role } = req.user!

    const clientId = await resolveClientId(userId, role, parsed.data.clientId)
    if (!clientId) return res.json({ clientId: null, currency: 'USD', rows: [] })

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { currency: true },
    })

    // Candidate set: non-deleted calls (own, for closers) that have at least one
    // follow-up tag in their history. We then keep only those whose LATEST tag is
    // still a follow-up type (current-tag semantics).
    const calls = await prisma.call.findMany({
      where: {
        clientId,
        deletedAt: null,
        ...(role === 'CLOSER' ? { closerId: userId } : {}),
        leadTags: { some: { tagType: { in: FOLLOWUP_TAGS } } },
      },
      select: {
        id: true,
        date: true,
        leadName: true,
        leadPhone: true,
        leadEmail: true,
        leadSource: true,
        outcome: true,
        revenueMinor: true,
        currency: true,
        followUpNotes: true,
        closer: { select: { id: true, name: true } },
        leadTags: { orderBy: { createdAt: 'desc' }, take: 1, select: { tagType: true, createdAt: true } },
      },
    })

    const clientCurrency = client?.currency ?? 'USD'
    const fxRates = clientCurrency !== 'USD' ? await getLatestRates('USD') : {}
    const toUsdMinor = (amt: number) =>
      Math.round(convertToDisplay(amt, clientCurrency, 'USD', fxRates) * 100)

    const rows = calls
      .map((c) => ({ c, latest: c.leadTags[0] }))
      .filter((x) => x.latest != null && FOLLOWUP_TAGS.includes(x.latest.tagType))
      .map(({ c, latest }) => ({
        id: c.id,
        date: c.date.toISOString().slice(0, 10),
        leadName: c.leadName,
        leadPhone: c.leadPhone,
        leadEmail: c.leadEmail,
        leadSource: c.leadSource,
        outcome: c.outcome,
        revenueMinor: toUsdMinor(c.revenueMinor),
        currency: 'USD',
        followUpNotes: c.followUpNotes,
        closerName: c.closer.name,
        closerId: c.closer.id,
        currentTag: latest!.tagType,
        taggedAt: latest!.createdAt.toISOString(),
      }))
      // Hot follow-ups first, then most recently tagged.
      .sort((a, b) => {
        if (a.currentTag !== b.currentTag) return a.currentTag === 'HOT_FOLLOW_UP' ? -1 : 1
        return b.taggedAt.localeCompare(a.taggedAt)
      })

    return res.json({ clientId, currency: 'USD', rows })
  } catch (error) {
    next(error)
  }
})

export default router
