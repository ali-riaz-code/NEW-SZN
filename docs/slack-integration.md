# Slack Integration

One bot, one workspace, app-wide: a single global bot token (`SLACK_BOT_TOKEN`
env var, never stored in the DB) sends every Slack message this app ever
sends. There is no per-client Slack config, no per-client bot token, and no
per-client channel — clients never receive Slack messages at all; they only
access their read-only dashboard.

## Message types sent

| Message type | Trigger | Recipient |
|---|---|---|
| Leaderboard | Daily cron (08:00) | Global "overall" channel |
| Milestones (master) | Configurable master switch | Global "overall" channel |
| Streak milestone | Setter hits a streak tier | Global "overall" channel |
| Big deal celebration | Deal above the client's threshold closed | Global "overall" channel |
| Daily targets | Morning cron (07:00) | Personal DM to each closer/setter |
| Loss debrief | Closer logs a lost call | Personal DM to that closer |
| Anomaly alert | 4-hour anomaly cron fires | Personal DM to every active admin |

## Auth

- Slack Bot Token (`SLACK_BOT_TOKEN` env var) — the one and only token, set at
  the infra level. Never editable from the Settings UI (which only shows a
  read-only "connected" indicator) and never persisted to the database.
- OAuth scopes: `chat:write` (channel posts + DMs), `users:read.email`
  (email → Slack user id lookup for DM targeting).

## Global configuration (Settings → Slack tab)

- One "overall channel ID", used for Leaderboard, Milestones (master + streak),
  and Big-deal celebration.
- Global on/off toggles per message type (leaderboard, milestones master,
  streak milestones, big-deal, loss debrief, anomaly alerts, daily targets) —
  app-wide, not per client.
- The big-deal revenue threshold stays per-client (`Client.bigDealThresholdMinor`,
  edited in Settings → Clients), since deals are denominated in each client's
  own currency — decoupled from Slack plumbing.

## DM targeting

Personal DMs (Daily Targets, Loss Debrief, Anomaly alerts) resolve the
recipient's Slack user id via `User.slackUserId` (settable in Settings → Users)
or, if unset, a live `users.lookupByEmail` call against the user's app email —
the result is cached back onto `User.slackUserId` so the lookup only happens
once per user. See `resolveSlackUserId` / `sendSlackDM` in
`apps/api/src/integrations/slack.ts`.
