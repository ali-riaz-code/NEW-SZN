> Status: stub — full UI spec to be added. See `docs/kpi-calculations.md` for all KPI formulas.

# Appointment Setting Dashboard

Tracks the setter team's conversation funnel: new conversations → responses → call proposals → calls booked.

## Cards (8 metrics)
Leads (New Conversations), Responses, Call Proposals, Calls Booked, Follow-ups, Lead/Response %, Proposal/Response %, Call/Proposal %, Call/Lead %, Pacing.

## Additional components
Booking trend chart.

30-day heatmap — shows how busy each day was (activity density per day).

Mini trend lines on each metric card.

Setter streaks panel: Current Streak, Best Streak, Total Days, tier label (LEGENDARY 10+, ON FIRE 7+, Hot 4+, Warm 2+).

Leaderboard: by Calls Booked and by Lead/Call Rate (efficiency).

Setter Attribution Panel: per-setter — Calls Set, Deals Closed from those calls, Revenue, Set→Close Rate.

"Log Day" form for setters to record daily activity.

## KPI formulas
All formulas and worked examples (including streak logic and attribution wiring): `docs/kpi-calculations.md` → Setter Dashboard section.

## TODO
- Component specs
- "Log Day" form validation (Zod schema)
- API route: `GET /api/dashboard/setter`
