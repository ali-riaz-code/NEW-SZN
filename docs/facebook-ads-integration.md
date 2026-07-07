> Status: stub — expand during Phase 6 (Meta Integration) build

# Facebook / Instagram Ads Integration

## Overview
Pulls Meta Marketing API data into the Ads Dashboard. Data is stored per-ad per-day (not aggregated) so the dashboard can slice any time range accurately.

## Sync schedule
- **Automatic:** every hour
- **Manual:** user-triggered via "Sync" button on Ads dashboard; 15-minute cooldown enforced server-side
- **Retention:** 90 days of daily ad metrics kept

## Fields pulled per ad per day
`spend`, `impressions`, `reach`, `results`, `cost_per_result`, `ctr`, `cpm`, `cpc`

## Lead count fallback
Meta sometimes returns `results = 0` but includes a non-zero `cost_per_result`. In that case derive: `leads = spend / cost_per_result`. See `docs/kpi-calculations.md` → Total Leads.

## Auth
- Long-lived System User access token (`META_SYSTEM_USER_TOKEN`) — not a regular user token, which expires.
- Scoped to the ad account IDs per client (configurable in Admin Settings).
- Required env vars: `META_APP_ID`, `META_APP_SECRET`, `META_SYSTEM_USER_TOKEN`

## Post-sync AI
After each sync completes, trigger Campaign Narratives AI feature (see `docs/ai-features.md`).

## TODO
- API auth flow
- Rate-limit handling
- Partial-sync failure recovery (don't leave a day half-written)
