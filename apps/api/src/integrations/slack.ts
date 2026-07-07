// Slack integration — outbound only. See docs/slack-integration.md.
//
// One bot, one token: every message this app ever sends uses process.env.SLACK_BOT_TOKEN.
// There is no per-client token or channel.
//
//   • Leaderboard, Milestones (master + streak), Big-deal celebration → post to
//     the single global "overall channel" (SlackSettings.overallChannelId).
//   • Daily Targets, Loss Debrief, Anomaly alerts → personal DM to the specific
//     user (closer/setter/admin), resolved via User.slackUserId (or looked up
//     live from Slack by email and cached, see resolveSlackUserId).
//
// Every message type is gated by a global enable flag on SlackSettings. A
// missing/disabled flag or unset channel is not an error — it's just a no-op.

import { prisma } from '@new-szn/db'
import { formatMoney } from '../lib/money'

const SLACK_POST_URL = 'https://slack.com/api/chat.postMessage'
const SLACK_LOOKUP_URL = 'https://slack.com/api/users.lookupByEmail'

// Singleton row id for SlackSettings — always read/written against this key.
export const SLACK_SETTINGS_ID = 'global'

interface SlackBlock {
  type: string
  text?: { type: string; text: string; emoji?: boolean }
  fields?: Array<{ type: string; text: string }>
}

// Low-level send. Resolves false (never throws) so a Slack outage can't break a
// request path or crash a cron job.
export async function postToSlack(
  token: string,
  channel: string,
  text: string,
  blocks?: SlackBlock[],
): Promise<boolean> {
  if (!token || !channel) return false
  try {
    const res = await fetch(SLACK_POST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ channel, text, blocks }),
    })
    const data = (await res.json()) as { ok?: boolean; error?: string }
    if (!data.ok) {
      console.error(`[slack] postMessage failed: ${data.error}`)
      return false
    }
    return true
  } catch (err) {
    console.error('[slack] postMessage threw', err)
    return false
  }
}

// Back-compat helper — sends via the global bot token.
export async function sendSlackMessage(channel: string, text: string): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) throw new Error('SLACK_BOT_TOKEN is not configured')
  await postToSlack(token, channel, text)
}

function header(text: string): SlackBlock {
  return { type: 'header', text: { type: 'plain_text', text, emoji: true } }
}
function section(text: string): SlackBlock {
  return { type: 'section', text: { type: 'mrkdwn', text } }
}
function fields(pairs: Array<[string, string]>): SlackBlock {
  return {
    type: 'section',
    fields: pairs.map(([k, v]) => ({ type: 'mrkdwn', text: `*${k}*\n${v}` })),
  }
}

async function getSlackSettings() {
  return prisma.slackSettings.findUnique({ where: { id: SLACK_SETTINGS_ID } })
}

// Resolve a user's Slack user id for DMs: stored field first, else a live
// users.lookupByEmail call against their app email, cached back onto the user
// row so future sends skip the lookup.
export async function resolveSlackUserId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { slackUserId: true, email: true },
  })
  if (!user) return null
  if (user.slackUserId) return user.slackUserId

  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return null
  try {
    const url = new URL(SLACK_LOOKUP_URL)
    url.searchParams.set('email', user.email)
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
    const data = (await res.json()) as { ok?: boolean; user?: { id?: string }; error?: string }
    if (!data.ok || !data.user?.id) {
      console.error(`[slack] users.lookupByEmail failed for ${user.email}: ${data.error}`)
      return null
    }
    await prisma.user.update({ where: { id: userId }, data: { slackUserId: data.user.id } })
    return data.user.id
  } catch (err) {
    console.error('[slack] users.lookupByEmail threw', err)
    return null
  }
}

// Generic personal DM. Resolves the target's Slack user id (stored or looked
// up + cached) and sends via the global bot token. Never throws.
export async function sendSlackDM(userId: string, text: string, blocks?: SlackBlock[]): Promise<boolean> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return false
  const slackUserId = await resolveSlackUserId(userId)
  if (!slackUserId) return false
  return postToSlack(token, slackUserId, text, blocks)
}

// ─── Message builders ───────────────────────────────────────────────────────────

export interface LeaderRow {
  name: string
  revenueMinor: number
  deals: number
  closeRatePct: number
}

function leaderboardBlocks(currency: string, rows: LeaderRow[]): SlackBlock[] {
  const medals = ['🥇', '🥈', '🥉']
  const lines = rows.map((r, i) => {
    const rank = medals[i] ?? `${i + 1}.`
    return `${rank} *${r.name}* — ${formatMoney(r.revenueMinor, currency)} · ${r.deals} deals · ${r.closeRatePct.toFixed(0)}% close`
  })
  return [header('🏆 Closer Leaderboard'), section(lines.join('\n') || '_No calls logged yet._')]
}

export interface LossDebriefPayload {
  closerName: string
  leadName: string
  outcome: string
  objectionType?: string | null
  analysis: string
}

function lossDebriefBlocks(p: LossDebriefPayload): SlackBlock[] {
  return [
    header('🔍 Loss Debrief'),
    fields([
      ['Closer', p.closerName],
      ['Lead', p.leadName],
      ['Outcome', p.outcome.replace(/_/g, ' ')],
      ['Objection', p.objectionType ? p.objectionType.replace(/_/g, ' ') : '—'],
    ]),
    section(p.analysis),
  ]
}

export interface AnomalyPayload {
  clientName: string
  severity: 'WARNING' | 'CRITICAL'
  kpiKey: string
  dropPct: number
  message: string
}

function anomalyBlocks(p: AnomalyPayload): SlackBlock[] {
  const icon = p.severity === 'CRITICAL' ? '🚨' : '⚠️'
  return [
    header(`${icon} ${p.severity}: ${p.kpiKey}`),
    section(`*${p.clientName}* — ${p.message}`),
    section(`Down *${p.dropPct.toFixed(1)}%* vs 28-day average.`),
  ]
}

// Milestones are two DISTINCT message types with distinct triggers and content:
//   • Big-deal celebration — a single call closed above a revenue threshold.
//   • Streak milestone      — a setter crossed a consecutive-day activity tier.
// They are never collapsed into one generic "milestone".

export interface BigDealPayload {
  closerName: string
  leadName: string
  amountMinor: number
  currency: string
}

function bigDealBlocks(p: BigDealPayload): SlackBlock[] {
  return [
    header('🎉 Big Deal Closed!'),
    section(
      `*${p.closerName}* just closed *${p.leadName}* for *${formatMoney(p.amountMinor, p.currency)}* 🚀`,
    ),
  ]
}

export interface StreakMilestonePayload {
  setterName: string
  streak: number
  tier: string
}

function streakMilestoneBlocks(p: StreakMilestonePayload): SlackBlock[] {
  return [
    header('🔥 Streak Milestone'),
    section(
      `*${p.setterName}* is on a *${p.streak}-day* logging streak — *${p.tier}* tier! Keep it going.`,
    ),
  ]
}

// ─── Overall-channel dispatchers (leaderboard, milestones, big-deal) ─────────────

export async function sendLeaderboard(currency: string, rows: LeaderRow[]): Promise<boolean> {
  const token = process.env.SLACK_BOT_TOKEN
  const settings = await getSlackSettings()
  if (!token || !settings?.leaderboardEnabled || !settings.overallChannelId) return false
  return postToSlack(token, settings.overallChannelId, 'Closer Leaderboard', leaderboardBlocks(currency, rows))
}

export async function sendBigDealCelebration(p: BigDealPayload): Promise<boolean> {
  const token = process.env.SLACK_BOT_TOKEN
  const settings = await getSlackSettings()
  if (!token || !settings?.bigDealEnabled || !settings.overallChannelId) return false
  return postToSlack(token, settings.overallChannelId, `Big deal closed — ${p.leadName}`, bigDealBlocks(p))
}

export async function sendStreakMilestone(p: StreakMilestonePayload): Promise<boolean> {
  const token = process.env.SLACK_BOT_TOKEN
  const settings = await getSlackSettings()
  if (!token || !settings?.streakMilestoneEnabled || !settings.overallChannelId) return false
  return postToSlack(token, settings.overallChannelId, `Streak milestone — ${p.setterName}`, streakMilestoneBlocks(p))
}

// ─── Personal-DM dispatchers (loss debrief, anomaly, daily targets) ──────────────

export async function sendLossDebrief(closerId: string, p: LossDebriefPayload): Promise<boolean> {
  const settings = await getSlackSettings()
  if (!settings?.lossDebriefEnabled) return false
  return sendSlackDM(closerId, `Loss Debrief — ${p.leadName}`, lossDebriefBlocks(p))
}

export async function sendAnomalyAlert(adminId: string, p: AnomalyPayload): Promise<boolean> {
  const settings = await getSlackSettings()
  if (!settings?.alertsEnabled) return false
  return sendSlackDM(adminId, `${p.severity}: ${p.kpiKey}`, anomalyBlocks(p))
}

// Daily target DM to a single user (closer/setter).
export async function sendDailyTargetDM(userId: string, text: string): Promise<boolean> {
  const settings = await getSlackSettings()
  if (!settings?.dailyTargetsEnabled) return false
  return sendSlackDM(userId, text, [header('🎯 Your Targets Today'), section(text)])
}
