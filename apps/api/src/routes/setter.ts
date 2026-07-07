import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '@new-szn/db'
import {
  goalProgress,
  computeStreaks,
} from '@new-szn/db/kpi'
import { requireRole } from '../middleware/auth'
import { maybeSendStreakMilestone } from '../integrations/slack-milestones'
import { id } from '../lib/validation'
import { mostRecentSetterDate, anchorRefDate, dashboardPeriod } from '../lib/period'

const router = Router()

// ─── Log Day ──────────────────────────────────────────────────────────────────

const logDaySchema = z.object({
  clientId: id,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  newConvos: z.number().int().min(0),
  responses: z.number().int().min(0),
  offers: z.number().int().min(0),
  bookedCalls: z.number().int().min(0),
  followUps: z.number().int().min(0),
  followUpOffers: z.number().int().min(0).default(0),
  followUpBookedCalls: z.number().int().min(0).default(0),
  followerCount: z.number().int().min(0).optional(),
})

router.post('/log', requireRole(['SETTER', 'ADMIN']), async (req, res, next) => {
  try {
    const parsed = logDaySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const { userId, role } = req.user!
    const data = parsed.data

    // Setters can only log for themselves; admins can log for any member
    const setterId = role === 'ADMIN' ? (req.body.setterId ?? userId) : userId

    // Verify setter is a member of this client
    if (role !== 'ADMIN') {
      const mem = await prisma.membership.findUnique({
        where: { userId_clientId: { userId: setterId, clientId: data.clientId } },
        select: { id: true },
      })
      if (!mem) return res.status(403).json({ error: 'Not a member of this client.' })
    }

    const log = await prisma.setterLog.upsert({
      where: {
        setterId_clientId_date: {
          setterId,
          clientId: data.clientId,
          date: new Date(data.date),
        },
      },
      update: {
        newConvos: data.newConvos,
        responses: data.responses,
        offers: data.offers,
        bookedCalls: data.bookedCalls,
        followUps: data.followUps,
        followUpOffers: data.followUpOffers,
        followUpBookedCalls: data.followUpBookedCalls,
        followerCount: data.followerCount,
      },
      create: {
        setterId,
        clientId: data.clientId,
        date: new Date(data.date),
        newConvos: data.newConvos,
        responses: data.responses,
        offers: data.offers,
        bookedCalls: data.bookedCalls,
        followUps: data.followUps,
        followUpOffers: data.followUpOffers,
        followUpBookedCalls: data.followUpBookedCalls,
        followerCount: data.followerCount,
      },
    })

    // Celebrate streak milestones in Slack (fire-and-forget — no-ops off a boundary).
    maybeSendStreakMilestone(setterId, data.clientId)

    return res.status(201).json({ id: log.id })
  } catch (error) {
    next(error)
  }
})

// ─── Metrics ──────────────────────────────────────────────────────────────────

const metricsQuerySchema = z.object({
  clientId: id.optional(),
})

router.get(
  '/metrics',
  requireRole(['SETTER', 'ADMIN']),
  async (req, res, next) => {
    try {
      const parsed = metricsQuerySchema.safeParse(req.query)
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

      const { userId, role } = req.user!

      let clientId = parsed.data.clientId
      if (!clientId) {
        if (role === 'ADMIN') {
          const latest = await prisma.setterLog.findFirst({
            orderBy: { date: 'desc' },
            select: { clientId: true },
          })
          clientId = latest?.clientId
        } else {
          const mems = await prisma.membership.findMany({
            where: { userId },
            select: { clientId: true },
          })
          const ids = mems.map((m) => m.clientId)
          const latest = await prisma.setterLog.findFirst({
            where: { setterId: userId, clientId: { in: ids } },
            orderBy: { date: 'desc' },
            select: { clientId: true },
          })
          clientId = latest?.clientId ?? ids[0]
        }
      }

      if (!clientId) return res.json({ empty: true })

      // Anchor the reporting window on the client's most recent setter log so the
      // dashboard (and its 30-day heatmap / streaks) reflects real activity even
      // when the current month is empty.
      const now = new Date()
      const refDate = anchorRefDate(await mostRecentSetterDate(clientId), now)
      const { curStart, curEnd, prevStart, prevEnd, curDays, curElapsed, month, year, refEnd } =
        dashboardPeriod(refDate, now)

      const setterScope = role === 'SETTER' ? { setterId: userId } : {}
      const trail30Start = new Date(refEnd)
      trail30Start.setDate(trail30Start.getDate() - 29)

      const [curLogs, prevLogs, trail30Logs, goals, client] = await Promise.all([
        prisma.setterLog.findMany({
          where: { clientId, ...setterScope, date: { gte: curStart, lte: curEnd } },
          orderBy: { date: 'asc' },
          include: { setter: { select: { id: true, name: true } } },
        }),
        prisma.setterLog.findMany({
          where: { clientId, ...setterScope, date: { gte: prevStart, lte: prevEnd } },
          select: {
            newConvos: true,
            responses: true,
            offers: true,
            bookedCalls: true,
            followUps: true,
          },
        }),
        prisma.setterLog.findMany({
          where: { clientId, ...setterScope, date: { gte: trail30Start, lte: refEnd } },
          orderBy: { date: 'asc' },
          select: { date: true, bookedCalls: true, newConvos: true },
        }),
        prisma.goal.findMany({
          where: {
            clientId,
            month,
            year,
            kpiKey: { in: ['bookedCalls', 'newConvos'] },
          },
          select: { kpiKey: true, targetMinor: true, targetValue: true, greenPct: true, amberPct: true },
        }),
        prisma.client.findUnique({ where: { id: clientId }, select: { currency: true } }),
      ])

      // Current month totals
      const cur = {
        newConvos: curLogs.reduce((s, l) => s + l.newConvos, 0),
        responses: curLogs.reduce((s, l) => s + l.responses, 0),
        offers: curLogs.reduce((s, l) => s + l.offers, 0),
        bookedCalls: curLogs.reduce((s, l) => s + l.bookedCalls, 0),
        followUps: curLogs.reduce((s, l) => s + l.followUps, 0),
      }
      const prev = {
        newConvos: prevLogs.reduce((s, l) => s + l.newConvos, 0),
        responses: prevLogs.reduce((s, l) => s + l.responses, 0),
        offers: prevLogs.reduce((s, l) => s + l.offers, 0),
        bookedCalls: prevLogs.reduce((s, l) => s + l.bookedCalls, 0),
        followUps: prevLogs.reduce((s, l) => s + l.followUps, 0),
      }

      function trendPct(c: number, p: number) {
        if (p === 0) return c > 0 ? 100 : 0
        return Math.round(((c - p) / p) * 1000) / 10
      }

      // Rate metrics
      const leadResponsePct = cur.newConvos > 0 ? (cur.responses / cur.newConvos) * 100 : 0
      const proposalResponsePct = cur.responses > 0 ? (cur.offers / cur.responses) * 100 : 0
      const callProposalPct = cur.offers > 0 ? (cur.bookedCalls / cur.offers) * 100 : 0
      const callLeadPct = cur.newConvos > 0 ? (cur.bookedCalls / cur.newConvos) * 100 : 0

      const prevLeadResponsePct =
        prev.newConvos > 0 ? (prev.responses / prev.newConvos) * 100 : 0
      const prevProposalResponsePct =
        prev.responses > 0 ? (prev.offers / prev.responses) * 100 : 0
      const prevCallProposalPct = prev.offers > 0 ? (prev.bookedCalls / prev.offers) * 100 : 0
      const prevCallLeadPct =
        prev.newConvos > 0 ? (prev.bookedCalls / prev.newConvos) * 100 : 0

      // Pacing
      const elapsed = curElapsed
      const bookedGoal = goals.find((g) => g.kpiKey === 'bookedCalls')
      const bookedTarget = bookedGoal ? Number(bookedGoal.targetValue ?? 0) : 0
      const pacingBooked =
        elapsed > 0 ? Math.round((cur.bookedCalls / elapsed) * curDays) : 0

      function getGoal(kpiKey: string, actual: number) {
        const g = goals.find((row) => row.kpiKey === kpiKey)
        if (!g) return undefined
        const target = Number(g.targetValue ?? 0)
        if (target === 0) return undefined
        const { pct, band } = goalProgress(actual, target, g.greenPct, g.amberPct)
        return { pct: Math.round(pct), band }
      }

      // Sparkline arrays — one entry per logged day (curLogs is already asc by date)
      const logsByDay = new Map<string, typeof curLogs[number]>()
      for (const log of curLogs) {
        logsByDay.set(log.date.toISOString().slice(0, 10), log)
      }
      const newConvosByDay = curLogs.map((l) => l.newConvos)
      const responsesByDay = curLogs.map((l) => l.responses)
      const offersByDay = curLogs.map((l) => l.offers)
      const bookedByDay = curLogs.map((l) => l.bookedCalls)
      const followUpsByDay = curLogs.map((l) => l.followUps)
      const leadRateSpark = curLogs.map((l) => l.newConvos > 0 ? (l.responses / l.newConvos) * 100 : 0)
      const proposalRateSpark = curLogs.map((l) => l.responses > 0 ? (l.offers / l.responses) * 100 : 0)
      const callProposalRateSpark = curLogs.map((l) => l.offers > 0 ? (l.bookedCalls / l.offers) * 100 : 0)
      const callLeadRateSpark = curLogs.map((l) => l.newConvos > 0 ? (l.bookedCalls / l.newConvos) * 100 : 0)

      // 30-day heatmap — all 30 days filled; zero for days with no log entry
      const logByDate = new Map(trail30Logs.map((l) => [l.date.toISOString().slice(0, 10), l]))
      const heatmap: Array<{ date: string; value: number; bookedCalls: number }> = []
      const cursor = new Date(trail30Start)
      while (cursor <= refEnd) {
        const dateStr = cursor.toISOString().slice(0, 10)
        const l = logByDate.get(dateStr)
        heatmap.push({ date: dateStr, value: l ? l.bookedCalls + l.newConvos : 0, bookedCalls: l ? l.bookedCalls : 0 })
        cursor.setDate(cursor.getDate() + 1)
      }

      // Booking trend — all 30 days filled so x-axis spacing is continuous
      const bookingTrend: Array<{ date: string; bookedCalls: number }> = []
      const btCursor = new Date(trail30Start)
      while (btCursor <= refEnd) {
        const dateStr = btCursor.toISOString().slice(0, 10)
        const l = logByDate.get(dateStr)
        bookingTrend.push({ date: dateStr, bookedCalls: l ? l.bookedCalls : 0 })
        btCursor.setDate(btCursor.getDate() + 1)
      }

      // Setter streaks (for own setter or all setters if admin)
      const setterStreaks = computeStreaks(trail30Logs.map((l) => l.date.toISOString().slice(0, 10)))

      const currency = 'USD'

      return res.json({
        clientId,
        currency,
        kpis: {
          newConvos:           { value: cur.newConvos,   trendPct: trendPct(cur.newConvos, prev.newConvos),     goal: getGoal('newConvos', cur.newConvos),      sparkline: newConvosByDay },
          responses:           { value: cur.responses,   trendPct: trendPct(cur.responses, prev.responses),                                                    sparkline: responsesByDay },
          callProposals:       { value: cur.offers,      trendPct: trendPct(cur.offers, prev.offers),                                                          sparkline: offersByDay },
          bookedCalls:         { value: cur.bookedCalls, trendPct: trendPct(cur.bookedCalls, prev.bookedCalls), goal: getGoal('bookedCalls', cur.bookedCalls), sparkline: bookedByDay },
          followUps:           { value: cur.followUps,   trendPct: trendPct(cur.followUps, prev.followUps),                                                    sparkline: followUpsByDay },
          leadResponsePct:     { value: Math.round(leadResponsePct * 10) / 10,      trendPct: trendPct(leadResponsePct, prevLeadResponsePct),                  sparkline: leadRateSpark },
          proposalResponsePct: { value: Math.round(proposalResponsePct * 10) / 10,  trendPct: trendPct(proposalResponsePct, prevProposalResponsePct),          sparkline: proposalRateSpark },
          callProposalPct:     { value: Math.round(callProposalPct * 10) / 10,      trendPct: trendPct(callProposalPct, prevCallProposalPct),                  sparkline: callProposalRateSpark },
          callLeadPct:         { value: Math.round(callLeadPct * 10) / 10,          trendPct: trendPct(callLeadPct, prevCallLeadPct),                          sparkline: callLeadRateSpark },
          pacing: { projected: pacingBooked, target: bookedTarget, sparkline: bookedByDay },
        },
        bookingTrend,
        heatmap,
        streaks: setterStreaks,
      })
    } catch (error) {
      next(error)
    }
  },
)

export default router
