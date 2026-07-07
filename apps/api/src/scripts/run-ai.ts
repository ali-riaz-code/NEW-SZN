// Phase 10 verification — drive each AI behavior against real imported data.
//
// Usage:
//   npx tsx apps/api/src/scripts/run-ai.ts --client "Matti" --feature insights --dashboard master
//   npx tsx apps/api/src/scripts/run-ai.ts --client "Matti" --feature nba
//   npx tsx apps/api/src/scripts/run-ai.ts --client "Matti" --feature anomaly
//   npx tsx apps/api/src/scripts/run-ai.ts --client "Matti" --feature targets --asof 2026-03-15
//   npx tsx apps/api/src/scripts/run-ai.ts --client "Matti" --feature lossdebrief
//   npx tsx apps/api/src/scripts/run-ai.ts --client "Matti" --feature narrative --asof 2024-02-15

import 'dotenv/config'
import { prisma } from '@new-szn/db'
import type { CallOutcome } from '@new-szn/db'
import { generateInsights, type DashboardKind } from '../integrations/ai-insights'
import { generateNextBestActions } from '../integrations/next-best-action'
import { detectAnomaliesForClient } from '../integrations/anomaly'
import { computeDailyTargets, sendDailyTargets } from '../integrations/daily-targets'
import { runLossDebrief } from '../integrations/loss-debrief'
import { generateCampaignNarrative } from '../integrations/campaign-narrative'

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i !== -1 ? process.argv[i + 1] : undefined
}

function parseAsOf(s?: string): Date | undefined {
  return s ? new Date(`${s}T12:00:00Z`) : undefined
}

async function resolveClient(idOrName: string) {
  const byId = await prisma.client.findUnique({ where: { id: idOrName } })
  if (byId) return byId
  return prisma.client.findFirst({
    where: { name: { contains: idOrName, mode: 'insensitive' } },
    orderBy: { name: 'asc' },
  })
}

const LOSS: CallOutcome[] = ['OFFER_DECLINED', 'NOT_A_FIT']

async function main() {
  const clientArg = arg('--client')
  const feature = arg('--feature')
  const asOf = parseAsOf(arg('--asof'))
  const dashboard = (arg('--dashboard') ?? 'master') as DashboardKind

  if (!clientArg || !feature) {
    console.error('Usage: run-ai.ts --client <id|name> --feature <insights|nba|anomaly|targets|lossdebrief|narrative> [--dashboard <d>] [--asof YYYY-MM-DD]')
    process.exit(1)
  }
  const client = await resolveClient(clientArg)
  if (!client) {
    console.error(`No client matched "${clientArg}".`)
    process.exit(1)
  }
  console.log(`Client: ${client.name} (${client.id}) — feature: ${feature}\n`)

  if (feature === 'insights') {
    const items = await generateInsights(client.id, dashboard)
    console.log(`AI Insights (${dashboard}):`)
    items.forEach((o, i) => console.log(`  ${i + 1}. ${o}`))
    if (items.length === 0) console.log('  (none — AI unconfigured or no data)')
  } else if (feature === 'nba') {
    const items = await generateNextBestActions(client.id)
    console.log('Next Best Action:')
    items.forEach((a, i) => console.log(`  ${i + 1}. ${a}`))
    if (items.length === 0) console.log('  (none)')
  } else if (feature === 'anomaly') {
    // If asOf given, test that day; else scan recent call days for a real dip.
    let candidates: Date[] = []
    if (asOf) candidates = [asOf]
    else {
      const rows = await prisma.call.findMany({
        where: { clientId: client.id, deletedAt: null },
        orderBy: { date: 'desc' },
        select: { date: true },
        take: 400,
      })
      const seen = new Set<string>()
      for (const r of rows) {
        const key = r.date.toISOString().slice(0, 10)
        if (!seen.has(key)) {
          seen.add(key)
          candidates.push(new Date(`${key}T12:00:00Z`))
        }
      }
    }
    let reported = false
    for (const c of candidates) {
      const results = await detectAnomaliesForClient(client.id, c)
      if (results.length > 0) {
        console.log(`Anomalies as of ${c.toISOString().slice(0, 10)}:`)
        results.forEach((r) => console.log(`  [${r.severity}] ${r.kpiKey} down ${r.dropPct.toFixed(1)}%`))
        reported = true
        break
      }
    }
    if (!reported) console.log('  No anomaly (>20% drop) found in the scanned window.')
  } else if (feature === 'targets') {
    const snapshots = await computeDailyTargets(client.id, asOf)
    console.log(`Computed ${snapshots.length} target(s):`)
    snapshots.forEach((s) =>
      console.log(`  ${s.name} (${s.role}) — MTD ${s.mtdText}, need ${s.dailyNeedText}, goal ${s.goalText}`),
    )
    const sent = await sendDailyTargets(client.id, asOf)
    console.log(`  ✓ DM'd ${sent} target(s) (users without a resolvable Slack id are skipped).`)
  } else if (feature === 'lossdebrief') {
    const call = await prisma.call.findFirst({
      where: { clientId: client.id, outcome: { in: LOSS }, deletedAt: null },
      orderBy: { date: 'desc' },
      select: { id: true, leadName: true, outcome: true },
    })
    if (!call) {
      console.log('  No lost call found for this client.')
    } else {
      console.log(`Triggering Loss Debrief for lost call: ${call.leadName} (${call.outcome})`)
      await runLossDebrief(call.id)
      console.log('  ✓ Loss Debrief run (DM\'d to the closer if a Slack id could be resolved).')
    }
  } else if (feature === 'narrative') {
    const refDate = asOf ?? new Date()
    const narrative = await generateCampaignNarrative(client.id, refDate)
    console.log(`Campaign Narrative (${refDate.toISOString().slice(0, 10)}):`)
    console.log(`  ${narrative ?? '(none — AI unconfigured or no ad data that month)'}`)
  } else {
    console.error(`Unknown feature "${feature}".`)
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
