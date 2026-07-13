// Reports API (Phase 11).
//   POST /api/reports/generate  → generate a report now (daily/weekly/monthly) — ADMIN
//   GET  /api/reports           → searchable/filterable history (paginated) — ADMIN + CLIENT (own client only)
//   GET  /api/reports/:id/download → stream the stored PDF (authed) — ADMIN + CLIENT (own client only)
//   GET/PATCH /api/reports/schedule → auto-generation cadence — ADMIN

import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '@new-szn/db'
import type { Prisma, ReportType } from '@new-szn/db'
import { requireRole } from '../middleware/auth'
import { id } from '../lib/validation'
import { generateReport } from '../integrations/reports'
import type { DateRange } from '../integrations/slack-reports'
import { storage } from '../integrations/storage'

const router = Router()

// Client IDs the caller may see reports for. CLIENT users are hard-limited to
// their memberships regardless of what clientId the query asks for.
async function memberClientIds(userId: string): Promise<string[]> {
  const mems = await prisma.membership.findMany({
    where: { userId },
    select: { clientId: true },
  })
  return mems.map((m) => m.clientId)
}

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const generateSchema = z.object({
  clientId: id,
  cadence: z.enum(['daily', 'weekly', 'monthly']),
  date: dateStr.optional(),
  startDate: dateStr.optional(),
  endDate: dateStr.optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
})

// POST /api/reports/generate — "Generate Now".
router.post('/generate', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const parsed = generateSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const { userId } = req.user!

    const client = await prisma.client.findUnique({
      where: { id: parsed.data.clientId },
      select: { id: true },
    })
    if (!client) return res.status(404).json({ error: 'Client not found.' })

    const { clientId, cadence, date, startDate, endDate, month } = parsed.data
    let overrideRange: DateRange | undefined
    if (cadence === 'daily' && date) {
      overrideRange = {
        start: new Date(`${date}T00:00:00.000Z`),
        end: new Date(`${date}T23:59:59.999Z`),
      }
    } else if (cadence === 'weekly' && startDate && endDate) {
      overrideRange = {
        start: new Date(`${startDate}T00:00:00.000Z`),
        end: new Date(`${endDate}T23:59:59.999Z`),
      }
    } else if (cadence === 'monthly' && month) {
      const parts = month.split('-')
      const y = Number(parts[0])
      const m = Number(parts[1])
      overrideRange = {
        start: new Date(Date.UTC(y, m - 1, 1)),
        end: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)),
      }
    }

    const result = await generateReport(clientId, cadence, userId, overrideRange)
    if (!result.ok) return res.status(422).json({ error: result.error })
    return res.status(201).json({ report: result.report })
  } catch (error) {
    next(error)
  }
})

const listSchema = z.object({
  clientId: id.optional(),
  type: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})

// GET /api/reports — history, filterable by client/type/date, paginated.
// CLIENT callers only ever see reports generated for their own client(s).
router.get('/', requireRole(['ADMIN', 'CLIENT']), async (req, res, next) => {
  try {
    const parsed = listSchema.safeParse(req.query)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const q = parsed.data
    const { userId, role } = req.user!

    const where: Prisma.ReportWhereInput = {}
    if (role === 'CLIENT') {
      const ownIds = await memberClientIds(userId)
      if (ownIds.length === 0)
        return res.json({ rows: [], total: 0, page: q.page, pageSize: q.pageSize })
      // A requested clientId is honored only if it belongs to the caller.
      where.clientId =
        q.clientId && ownIds.includes(q.clientId) ? q.clientId : { in: ownIds }
    } else if (q.clientId) {
      where.clientId = q.clientId
    }
    if (q.type) where.type = q.type as ReportType
    if (q.from || q.to) {
      const f: { gte?: Date; lte?: Date } = {}
      if (q.from) f.gte = new Date(`${q.from}T00:00:00`)
      if (q.to) f.lte = new Date(`${q.to}T23:59:59.999`)
      where.generatedAt = f
    }

    const [total, rows] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        select: {
          id: true,
          type: true,
          periodStart: true,
          periodEnd: true,
          generatedAt: true,
          s3Url: true,
          client: { select: { id: true, name: true } },
          generator: { select: { name: true } },
        },
      }),
    ])

    return res.json({
      rows: rows.map((r) => ({
        id: r.id,
        type: r.type,
        clientId: r.client.id,
        clientName: r.client.name,
        periodStart: r.periodStart.toISOString().slice(0, 10),
        periodEnd: r.periodEnd.toISOString().slice(0, 10),
        generatedAt: r.generatedAt.toISOString(),
        generatedBy: r.generator.name,
        downloadUrl: r.s3Url,
      })),
      total,
      page: q.page,
      pageSize: q.pageSize,
    })
  } catch (error) {
    next(error)
  }
})

const scheduleQuerySchema = z.object({ clientId: id })
const scheduleBodySchema = z.object({
  clientId: id,
  schedule: z.enum(['daily', 'weekly', 'monthly']).nullable(),
})

// GET /api/reports/schedule?clientId=xxx — current auto-generation cadence.
router.get('/schedule', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const parsed = scheduleQuerySchema.safeParse(req.query)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const client = await prisma.client.findUnique({
      where: { id: parsed.data.clientId },
      select: { reportSchedule: true },
    })
    if (!client) return res.status(404).json({ error: 'Client not found.' })
    return res.json({ schedule: client.reportSchedule ?? null })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/reports/schedule — set or clear the auto-generation cadence.
router.patch('/schedule', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const parsed = scheduleBodySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const exists = await prisma.client.findUnique({
      where: { id: parsed.data.clientId },
      select: { id: true },
    })
    if (!exists) return res.status(404).json({ error: 'Client not found.' })
    await prisma.client.update({
      where: { id: parsed.data.clientId },
      data: { reportSchedule: parsed.data.schedule },
    })
    return res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

// GET /api/reports/:id/download — stream the stored PDF.
// CLIENT callers may only download reports belonging to their own client(s).
router.get('/:id/download', requireRole(['ADMIN', 'CLIENT']), async (req, res, next) => {
  try {
    const rid = id.safeParse(req.params.id)
    if (!rid.success) return res.status(400).json({ error: rid.error.flatten() })
    const { userId, role } = req.user!

    const report = await prisma.report.findUnique({
      where: { id: rid.data },
      select: { s3Key: true, type: true, clientId: true, client: { select: { name: true } }, periodEnd: true },
    })
    if (!report) return res.status(404).json({ error: 'Report not found.' })

    if (role === 'CLIENT') {
      const ownIds = await memberClientIds(userId)
      // 404 (not 403) so clients can't probe which report IDs exist.
      if (!ownIds.includes(report.clientId)) {
        return res.status(404).json({ error: 'Report not found.' })
      }
    }

    let body: Buffer
    try {
      body = await storage.getObject(report.s3Key)
    } catch {
      return res.status(410).json({ error: 'Report file is no longer available.' })
    }

    const safeName =
      `${report.client.name}-${report.type}-${report.periodEnd.toISOString().slice(0, 10)}.pdf`.replace(
        /[^a-zA-Z0-9._-]+/g,
        '_',
      )
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`)
    return res.send(body)
  } catch (error) {
    next(error)
  }
})

export default router
