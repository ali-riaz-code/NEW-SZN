// Report generation service (Phase 11).
//
// Orchestrates: resolve the reporting window → assemble the summary → get an AI
// narrative → render a PDF → store it → record a Report row. Deliberately reuses
// the Phase 9 assembly (resolveReportRange + buildReportSummary) so PDF numbers
// match the Slack reports, and the Phase 10 insight generator for the narrative
// (no separate narrative generator).

import { prisma } from '@new-szn/db'
import type { ReportType } from '@new-szn/db'
import { resolveReportRange, buildReportSummary, type Cadence } from './slack-reports'
import { generateInsights } from './ai-insights'
import { getAiTone } from '../lib/ai-config'
import { renderReportPdf } from './report-pdf'
import { storage } from './storage'

const CADENCE_TO_TYPE: Record<Cadence, ReportType> = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
}

const TITLE: Record<Cadence, string> = {
  daily: 'Daily Report',
  weekly: 'Weekly Report',
  monthly: 'Monthly Report',
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Human label for the covered window.
function periodLabel(cadence: Cadence, start: Date, end: Date): string {
  const monthYear = end.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  if (cadence === 'monthly') return monthYear
  const fmt = (d: Date) => d.toLocaleString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  if (cadence === 'daily') return `${fmt(start)} ${end.getUTCFullYear()}`
  return `${fmt(start)} – ${fmt(end)} ${end.getUTCFullYear()}`
}

export interface GeneratedReport {
  id: string
  type: ReportType
  clientId: string
  periodStart: string
  periodEnd: string
  generatedAt: string
}

export type GenerateResult =
  | { ok: true; report: GeneratedReport }
  | { ok: false; error: string }

// Generate one report end-to-end and persist it. `generatedBy` must be a real
// User id (the admin who clicked, or a resolved admin for the scheduled job).
export async function generateReport(
  clientId: string,
  cadence: Cadence,
  generatedBy: string,
): Promise<GenerateResult> {
  const range = await resolveReportRange(clientId, cadence)
  if (!range) return { ok: false, error: 'This client has no call data to report on.' }

  const summary = await buildReportSummary(clientId, range)
  if (!summary) return { ok: false, error: 'Client not found.' }

  // AI narrative: reuse the Phase 10 insight generator (Master dashboard scope),
  // honoring the client's 'master' AI personality. Empty [] when AI is off.
  const tone = await getAiTone('master')
  const narrative = await generateInsights(clientId, 'master', { tone }).catch(() => [])

  const pdf = await renderReportPdf({
    title: TITLE[cadence],
    clientName: summary.clientName,
    periodLabel: periodLabel(cadence, range.start, range.end),
    generatedAt: new Date(),
    summary,
    narrative,
  })

  const type = CADENCE_TO_TYPE[cadence]
  const key = `reports/${clientId}/${cadence}-${dayKey(range.start)}_${dayKey(range.end)}-${Date.now()}.pdf`

  // Create the row first so the download URL can reference its id, then store the
  // object and backfill the (authed) download URL.
  const report = await prisma.report.create({
    data: {
      clientId,
      type,
      month: range.end.getMonth() + 1,
      year: range.end.getFullYear(),
      periodStart: range.start,
      periodEnd: range.end,
      s3Key: key,
      s3Url: '',
      generatedBy,
    },
    select: { id: true, generatedAt: true },
  })

  await storage.putObject(key, pdf, 'application/pdf')
  const s3Url = `/api/reports/${report.id}/download`
  await prisma.report.update({ where: { id: report.id }, data: { s3Url } })

  return {
    ok: true,
    report: {
      id: report.id,
      type,
      clientId,
      periodStart: dayKey(range.start),
      periodEnd: dayKey(range.end),
      generatedAt: report.generatedAt.toISOString(),
    },
  }
}
