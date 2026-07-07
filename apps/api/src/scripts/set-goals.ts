// Set realistic monthly goals for a client (admin config, not fabricated data).
// Phase 11 builds the real goal-config UI; this lets Phase 10 pacing/target
// features be verified meaningfully.
//
// Usage:
//   npx tsx apps/api/src/scripts/set-goals.ts --client "Matti" --month 3 --year 2026 \
//     --revenue 15000000 --deals 25 --booked 40

import 'dotenv/config'
import { prisma } from '@new-szn/db'

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

async function main() {
  const clientArg = arg('--client')
  const month = Number(arg('--month'))
  const year = Number(arg('--year'))
  const revenue = arg('--revenue') // minor units
  const deals = arg('--deals')
  const booked = arg('--booked')

  if (!clientArg || !month || !year) {
    console.error(
      'Usage: set-goals.ts --client <id|name> --month <1-12> --year <yyyy> [--revenue <minor>] [--deals <n>] [--booked <n>]',
    )
    process.exit(1)
  }

  const client = await resolveClient(clientArg)
  if (!client) {
    console.error(`No client matched "${clientArg}".`)
    process.exit(1)
  }

  const upsertGoal = async (
    kpiKey: string,
    targetMinor: number | null,
    targetValue: number | null,
  ) => {
    await prisma.goal.upsert({
      where: { clientId_kpiKey_month_year: { clientId: client.id, kpiKey, month, year } },
      update: { targetMinor, targetValue, currency: targetMinor != null ? client.currency : null },
      create: {
        clientId: client.id,
        kpiKey,
        month,
        year,
        targetMinor,
        targetValue,
        currency: targetMinor != null ? client.currency : null,
      },
    })
    console.log(`  ✓ ${kpiKey} → ${targetMinor != null ? `${targetMinor} minor` : targetValue}`)
  }

  console.log(`Setting goals for ${client.name} — ${month}/${year}`)
  if (revenue) await upsertGoal('revenue', Number(revenue), null)
  if (deals) await upsertGoal('dealsWon', null, Number(deals))
  if (booked) await upsertGoal('bookedCalls', null, Number(booked))
  if (!revenue && !deals && !booked) console.error('  (no goal values provided)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
