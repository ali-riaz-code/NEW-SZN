> Status: stub — full UI spec to be added. See `docs/kpi-calculations.md` for all KPI formulas.

# Master Dashboard

High-altitude agency view. All KPI cards here are also available in deeper detail on the specialised dashboards.

## Cards
12 KPIs: Total Revenue, Total Cash Collected, Total Deals Won, Calls Taken, Booked Calls, Pacing, ROAS, Close Rate, Show-Up Rate, Cost per Call, Cost per Customer, Cost per Follower.

Monthly goal progress bars (green/amber/red — thresholds admin-configurable per client).

Daily trend arrows (up/down vs yesterday).

Closer leaderboard — ranked by revenue; columns: calls, deals, close rate, show-up rate, revenue.

Setter activity summary (admin view).

Interactive revenue and deal trend charts.

## Access
Visible to: Admin (all clients), Closer (own stats only), Setter (own stats only), Client (their client only).

## TODO
- Component specs (card layout, chart config)
- API route: `GET /api/dashboard/master`
