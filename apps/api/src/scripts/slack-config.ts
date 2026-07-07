// Upsert the single global SlackSettings row — used to configure the app's one
// overall channel (Leaderboard, Milestones, Big-deal) and message-type toggles.
// The bot token itself is never stored here: it's the SLACK_BOT_TOKEN env var.
//
// Usage:
//   npx tsx apps/api/src/scripts/slack-config.ts --channel C0123ABCD

import 'dotenv/config'
import { prisma } from '@new-szn/db'
import { SLACK_SETTINGS_ID } from '../integrations/slack'

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i !== -1 ? process.argv[i + 1] : undefined
}

async function main() {
  const channel = arg('--channel')
  const token = process.env.SLACK_BOT_TOKEN

  if (!channel) {
    console.error('Usage: npx tsx apps/api/src/scripts/slack-config.ts --channel <channelId>')
    process.exit(1)
  }
  if (!token) {
    console.error('SLACK_BOT_TOKEN is not set in the environment.')
    process.exit(1)
  }

  const settings = await prisma.slackSettings.upsert({
    where: { id: SLACK_SETTINGS_ID },
    update: { overallChannelId: channel },
    create: { id: SLACK_SETTINGS_ID, overallChannelId: channel },
    select: { overallChannelId: true },
  })

  console.log(`✓ Global overall Slack channel set → ${settings.overallChannelId}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
