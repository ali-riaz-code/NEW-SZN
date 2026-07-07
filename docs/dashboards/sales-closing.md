> Status: stub — full UI spec to be added. See `docs/kpi-calculations.md` for all KPI formulas.

# Sales & Closing Dashboard

Built for the closer team. Tracks call quality, conversion rates, deal economics, and lost-deal reasons.

## Cards
Revenue, Cash Collected, Deals Won / Lost, Close Rate, Show-Up Rate, Deposits, Revenue per Call, Cash per Call, Cash Upfront %, PIF %, Average Deal, Average Cash, Objection Counters (Think About It / Money / Time / Partner / Fear / Value).

## Accountability lock
**The dashboard is blurred and locked until the closer logs their first call of the day.** This is intentional UX — do not remove or bypass it.

## Call log
Today's calls with: date, outcome, revenue, closer. Click any row to expand: full notes, objection reason, contact info.

Outcome pie chart: Closed / Rescheduled / Lost / No-show.

Daily revenue trend chart.

"Log Call" form for closers to record new calls.

## KPI formulas
All formulas, denominator rules (rescheduled excluded, no-shows excluded from close rate), and worked examples: `docs/kpi-calculations.md` → Sales Dashboard section.

## TODO
- Component specs
- "Log Call" form validation (Zod schema)
- API route: `GET /api/dashboard/sales`
