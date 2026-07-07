> Status: stub — full UI spec to be added. See `docs/kpi-calculations.md` for all KPI formulas.

# Ads Dashboard

Surfaces Meta (Facebook/Instagram) ad performance and ties it back to revenue.

## Headline cards (12)
Total Spend, Total Leads, Cost per Follower, Cost per Conversation, ROAS Cash, ROAS Rev, Cost per Call, Cost per Customer, CTR, CPM, CPC, (and Frequency in per-ad table).

## Campaign table
Columns: Status, Daily Budget, Spend, Reach, Frequency, CPM, CTR, CPC, Results, Cost/Result, Followers, Cost/Follower.

Sortable and filterable. Filter by status: Active / Paused / Archived.

Ads can be categorized as **"Typeform-focused"** or **"Normal"** — admin-configurable per campaign.

Ads can be **flagged for review** with a reason — inline from the table.

## Sync
Manual sync button. 15-minute cooldown enforced server-side. After sync: AI Campaign Narrative generated (see `docs/ai-features.md`).

Auto-sync also runs hourly (see `docs/facebook-ads-integration.md`).

## KPI formulas
All formulas including leads fallback (derive from spend ÷ cost_per_result when results=0), impression-weighted CTR/CPM/CPC rollup, and worked examples: `docs/kpi-calculations.md` → Ads Dashboard section.

## TODO
- Component specs
- API route: `GET /api/dashboard/ads`
- Sync endpoint with cooldown logic: `POST /api/ads/sync`
