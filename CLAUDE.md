# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**NEW SZN** is a production SaaS performance dashboard for digital marketing agencies. Live with real customer data (30+ clients, 2,000+ logged calls, 50+ ad campaigns). Treat all data as real, not test data — favor backward-compatible migrations and feature flags over breaking changes.

## Stack

Next.js + TypeScript, Tailwind CSS, Node/Express API, PostgreSQL via Prisma.

## Commands

- `npm run dev` / `npm run build` / `npm run test`
- `npx prisma migrate dev` — run migrations
- `npx prisma studio` — inspect DB locally

## User Roles & Access Model

Four roles with strict data isolation:
- **Admin** — agency leadership; sees all clients, manages users/settings/AI/alerts
- **Closer** — salespeople; log calls, see own performance, get AI coaching on lost calls
- **Setter** — appointment bookers; log daily outreach activity, track ad follower growth
- **Client** — read-only view of their own business data only; cannot see other clients

Full permission matrix and client-scoping rules: `docs/auth-roles.md`

## Core Dashboards

1. **Master** — 12 KPIs (revenue, cash collected, close rate, ROAS, etc.), monthly goal progress bars (green/amber/red), daily trend arrows, leaderboard, charts. `docs/dashboards/master.md`
2. **Sales & Closing** — call log with outcomes, closer accountability lock (blurred until first call logged), revenue trend chart, "Log Call" form. `docs/dashboards/sales-closing.md`
3. **Ads** — 12 ad metrics, sortable/filterable campaign table, ad flagging, manual Facebook sync with 15-min cooldown, AI campaign narrative after sync. `docs/dashboards/ads.md`
4. **Appointment Setting** — 8 outreach metrics, daily activity log, 30-day heatmap, "Log Day" form. `docs/dashboards/appointment-setting.md`

Also: Call Logs (historical search/filter) and Lead Tagging & Follow-Up — `docs/call-logs-and-tagging.md`. Settings (admin-only control panel) — `docs/settings.md`

## AI Features

- **AI Insights** — per-dashboard button producing 4–6 plain-English observations from current metrics
- **Loss Debrief** — auto-triggered when a closer logs a lost call; root-cause analysis posted to Slack
- **Anomaly Detection** — runs every 4 hours; alerts on >20% drop (warning) or >35% drop (critical) vs. 28-day average
- **Next Best Action** — surfaces 3–5 urgent priorities based on current performance
- **Daily Targets** — personalized Slack DMs each morning to closers and setters
- **Campaign Narratives** — 1–2 sentence AI summary after each Facebook sync

These five behaviors have different triggers and output channels — don't assume shared logic. Full spec: `docs/ai-features.md`

## External Integrations

- **Facebook/Instagram Ads** — auto-sync hourly, manual sync available (15-min cooldown), 90-day history retained. `docs/facebook-ads-integration.md`
- **Slack** — daily/weekly/monthly reports, leaderboards, loss debriefs, anomaly alerts, milestones; all configurable per client. `docs/slack-integration.md`
- **Email** — account invites and password resets only
- **Multi-currency** — live exchange rate conversion across clients

## Key Rules

- Always validate API input with Zod
- Never commit `.env` or secrets
- Role-based access checks live in middleware, not scattered in route handlers
- Never hardcode currency symbols or assume USD — conversion rates are live, not static
- Don't "fix" the Sales dashboard lock/blur — it's intentional accountability UX, not a bug
- Respect the 15-min ad sync cooldown — don't bypass it for testing without flagging it
- Goal progress thresholds (green/amber/red) are admin-configurable per client — never hardcode them
- Ads are categorized as "Typeform-focused" or "Normal" and can be flagged for review with a reason
- Call logs support lead tagging (closed, follow-up, hot follow-up, no-show, declined, etc.) with inline editing; admins can reassign leads between closers

## Decision & Communication Protocols

- **Explicit assumptions** — state operational assumptions clearly before running complex processes; if uncertain about a requirement, halt and ask
- **Ambiguity management** — if multiple technical interpretations or paths exist, present them explicitly, never pick a path silently
- **Conservative scope** — do not refactor codebases, components, or scripts that are currently functional and unbroken

## Engineering Quality Loop

- **Iterative fix** — analyze the error, refactor the tool, verify the resolution, and update the workflow to achieve a permanently robust system

## Design Context

Full design spec: `apps/web/PRODUCT.md`. Read it before any UI work.

- **Register**: product — design serves the data, not the other way around
- **Personality**: Sharp / Relentless / Results-first. High-performance analytics room energy. Urgency is baked in, not added by copy.
- **Brand color**: `#c9a96e` (warm gold) — the one warmth concession in an otherwise dark, precise palette
- **Anti-references**: Notion/Linear minimal (sparse gray), generic SaaS (blue-sidebar beige), crypto hype (neon-on-black)
- **References**: Vercel dark mode, Linear dark mode — polished typographic hierarchy on dark surfaces
- **Key principle**: Numbers are the hero. Decoration earns its place by serving the signal. Never reverse this hierarchy.
