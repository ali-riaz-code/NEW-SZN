// Manual Slack send — verification against real imported data.
//
// Usage:
//   npx tsx apps/api/src/scripts/send-slack.ts --client "Matti" --type leaderboard
//   npx tsx apps/api/src/scripts/send-slack.ts --client "Matti" --type bigdeal
//   npx tsx apps/api/src/scripts/send-slack.ts --client "Matti" --type streak
//
// For bigdeal/streak the script finds a REAL qualifying row in the imported data
// and drives the same detector the routes use — no fabricated payloads.

import 'dotenv/config'
import { prisma } from '@new-szn/db'
import type { CallOutcome } from '@new-szn/db'
import { computeStreaks, STREAK_TIER_THRESHOLDS } from '@new-szn/db/kpi'
import { sendCloserLeaderboard } from '../integrations/slack-reports'
import { celebrateBigDeal, evaluateStreakMilestone } from '../integrations/slack-milestones'
import { formatMoney } from '../lib/money'

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i !== -1 ? process.argv[i + 1] : undefined
}

async function resolveClient(idOrName: string) {
  const byId = await prisma.client.findUnique({ where: { id: idOrName } })
  if (byId) return byId
  return prisma.client.findFirst({
    where: { name: { contains: idOrName, mode: 'insensitive' } },
    orderBy: { name: 'asc' },
  })
}

const CLOSED: CallOutcome[] = ['CLOSED_PIF', 'CLOSED_SPLIT_PAY', 'CLOSED_DEPOSIT']

async function doBigDeal(clientId: string): Promise<void> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { bigDealThresholdMinor: true },
  })
  if (!client) return
  // Find the biggest real closed deal for this client.
  const top = await prisma.call.findFirst({
    where: { clientId, outcome: { in: CLOSED }, deletedAt: null },
    orderBy: { revenueMinor: 'desc' },
    select: { id: true, leadName: true, revenueMinor: true, currency: true },
  })
  if (!top) {
    console.error('  No closed calls for this client.')
    return
  }
  console.log(
    `  Biggest closed deal: ${top.leadName} @ ${formatMoney(top.revenueMinor, top.currency)} ` +
      `(threshold ${formatMoney(client.bigDealThresholdMinor, top.currency)})`,
  )
  if (top.revenueMinor < client.bigDealThresholdMinor) {
    console.error(
      '  Biggest deal is below the threshold — lower it via the Clients settings tab to celebrate.',
    )
    return
  }
  const sent = await celebrateBigDeal(top.id)
  console.log(sent ? '  ✓ Big-deal celebration posted.' : '  ✗ Not posted (disabled/unconfigured).')
}

async function doStreak(clientId: string): Promise<void> {
  // Gather every setter's active days for this client, then find a (setter, asOf)
  // where the streak lands exactly on a tier boundary (2/4/7/10).
  const logs = await prisma.setterLog.findMany({
    where: { clientId },
    select: { setterId: true, date: true },
    orderBy: { date: 'asc' },
  })
  const bySetter = new Map<string, string[]>()
  for (const l of logs) {
    const arr = bySetter.get(l.setterId) ?? []
    arr.push(l.date.toISOString().slice(0, 10))
    bySetter.set(l.setterId, arr)
  }

  const boundaries = new Set<number>(STREAK_TIER_THRESHOLDS)
  for (const [setterId, allDates] of bySetter) {
    const unique = [...new Set(allDates)].sort()
    for (const d of unique) {
      const upTo = unique.filter((x) => x <= d)
      const asOf = new Date(`${d}T12:00:00Z`)
      const { current } = computeStreaks(upTo, asOf)
      if (boundaries.has(current)) {
        const setter = await prisma.user.findUnique({ where: { id: setterId }, select: { name: true } })
        console.log(`  Found: ${setter?.name ?? setterId} hits a ${current}-day streak as of ${d}`)
        const sent = await evaluateStreakMilestone(setterId, clientId, asOf)
        console.log(sent ? '  ✓ Streak milestone posted.' : '  ✗ Not posted (disabled/unconfigured).')
        return
      }
    }
  }
  console.error('  No setter reaches a tier boundary (2/4/7/10 consecutive days) in the imported data.')
}

async function main() {
  const clientArg = arg('--client')
  const type = arg('--type')

  if (!clientArg || !type) {
    console.error(
      'Usage: npx tsx apps/api/src/scripts/send-slack.ts --client <id|name> --type <leaderboard|bigdeal|streak>',
    )
    process.exit(1)
  }

  const client = await resolveClient(clientArg)
  if (!client) {
    console.error(`No client matched "${clientArg}".`)
    process.exit(1)
  }
  console.log(`Client: ${client.name} (${client.id})`)

  if (type === 'leaderboard') {
    const ok = await sendCloserLeaderboard(client.id)
    console.log(ok ? '  ✓ Leaderboard posted.' : '  ✗ Not posted (no data / disabled / unconfigured).')
  } else if (type === 'bigdeal') {
    await doBigDeal(client.id)
  } else if (type === 'streak') {
    await doStreak(client.id)
  } else {
    console.error(`Unknown --type "${type}".`)
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
