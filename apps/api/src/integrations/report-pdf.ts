// PDF rendering for client reports (Phase 11).
//
// Pure presentation: given a computed ReportSummary (from slack-reports.ts's
// buildReportSummary — the SAME assembly the Slack reports use) plus an AI
// narrative (from the Phase 10 insight generator), produce a PDF buffer. No data
// assembly lives here, so Slack and PDF always report identical numbers.

import PDFDocument from 'pdfkit'
import type { ReportSummary } from './slack-reports'
import { formatMoney } from '../lib/money'

export interface ReportPdfInput {
  title: string // e.g. "Monthly Report"
  clientName: string
  periodLabel: string // e.g. "March 2026" or "10–16 Mar 2026"
  generatedAt: Date
  summary: ReportSummary
  narrative: string[] // AI observations (may be empty when AI is unconfigured)
}

const INK = '#111827'
const MUTED = '#6b7280'
const ACCENT = '#2563eb'
const LINE = '#e5e7eb'

export function renderReportPdf(input: ReportPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const { summary: s } = input
    const left = doc.page.margins.left
    const right = doc.page.width - doc.page.margins.right
    const width = right - left

    // ── Header ────────────────────────────────────────────────────────────────
    doc.fillColor(ACCENT).fontSize(20).font('Helvetica-Bold').text('NEW SZN', left, 50)
    doc.fillColor(MUTED).fontSize(10).font('Helvetica').text('Performance Report', left, 74)
    doc
      .fillColor(INK)
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(input.title, left, 50, { width, align: 'right' })
    doc
      .fillColor(MUTED)
      .fontSize(10)
      .font('Helvetica')
      .text(input.clientName, left, 72, { width, align: 'right' })
      .text(input.periodLabel, left, 86, { width, align: 'right' })

    doc.moveTo(left, 108).lineTo(right, 108).strokeColor(LINE).lineWidth(1).stroke()

    // ── KPI grid ───────────────────────────────────────────────────────────────
    const cur = s.currency
    const cards: Array<[string, string]> = [
      ['Revenue', formatMoney(s.revenueMinor, cur)],
      ['Cash Collected', formatMoney(s.cashCollectedMinor, cur)],
      ['Deals Won', String(s.dealsWon)],
      ['Calls Taken', String(s.callsTaken)],
      ['Close Rate', `${s.closeRatePct.toFixed(1)}%`],
      ['Ad Spend', formatMoney(s.adSpendMinor, cur)],
      ['ROAS', `${s.roas.toFixed(2)}x`],
    ]

    const cols = 3
    const gap = 14
    const cardW = (width - gap * (cols - 1)) / cols
    const cardH = 62
    let cardTop = 130
    doc.fillColor(INK).fontSize(12).font('Helvetica-Bold').text('Key Metrics', left, cardTop)
    cardTop += 22

    cards.forEach((card, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = left + col * (cardW + gap)
      const y = cardTop + row * (cardH + gap)
      doc.roundedRect(x, y, cardW, cardH, 6).strokeColor(LINE).lineWidth(1).stroke()
      doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(card[0].toUpperCase(), x + 12, y + 12, { width: cardW - 24 })
      doc.fillColor(INK).fontSize(16).font('Helvetica-Bold').text(card[1], x + 12, y + 28, { width: cardW - 24 })
    })

    const rowsUsed = Math.ceil(cards.length / cols)
    let y = cardTop + rowsUsed * (cardH + gap) + 12

    // ── AI narrative ─────────────────────────────────────────────────────────────
    doc.fillColor(INK).fontSize(12).font('Helvetica-Bold').text('AI Narrative', left, y)
    y += 20
    if (input.narrative.length > 0) {
      doc.fillColor(INK).fontSize(10).font('Helvetica')
      for (const line of input.narrative) {
        doc.text('•  ' + line, left, y, { width, align: 'left' })
        y = doc.y + 6
      }
    } else {
      doc
        .fillColor(MUTED)
        .fontSize(10)
        .font('Helvetica-Oblique')
        .text('AI narrative unavailable (AI not configured).', left, y, { width })
      y = doc.y
    }

    // ── Footer ───────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - doc.page.margins.bottom - 14
    doc.moveTo(left, footerY - 8).lineTo(right, footerY - 8).strokeColor(LINE).lineWidth(1).stroke()
    doc
      .fillColor(MUTED)
      .fontSize(8)
      .font('Helvetica')
      .text(
        `Generated ${input.generatedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC · amounts in ${cur}`,
        left,
        footerY,
        { width, align: 'center' },
      )

    doc.end()
  })
}
