> Status: stub — expand during Phase 11 (Settings) build

# Admin Settings Panel

Admin-only control panel. Everything here is per-client unless noted.

## Configurable items

| Setting | Description |
|---|---|
| Monthly goals | Revenue, cash, calls booked, deals won targets per client per month |
| Ad account connections | Link each client to their Meta ad account ID |
| AI coaching personality | Tone/style of AI Insights and Loss Debrief per dashboard |
| Slack configuration | Global overall channel ID + message-type toggles (app-wide, not per client — see `docs/slack-integration.md`) |
| Alert thresholds | When to trigger anomaly alerts — configurable per metric per client |
| User management | Create/edit/deactivate users, assign roles, assign clients |
| Client management | Create/edit clients, set base currency |

## Goal progress thresholds
The goal progress bars (Master Dashboard) use three states: green / amber / red.
**These thresholds are admin-configurable per client** — never hardcode them. Default values TBD during Phase 1 schema design.

## TODO
- Settings API endpoints
- Settings UI (Admin only, gated by requireRole(['admin']))
- Goal threshold schema
