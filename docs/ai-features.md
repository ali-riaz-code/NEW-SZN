> Status: stub — expand during Phase 10 (AI Features) build

# AI Features

Five distinct AI behaviors. They have **different triggers and different output channels** — do not assume shared logic between them.

## Trigger → Behavior → Output channel

| Feature | Trigger | Output |
|---|---|---|
| **AI Insights** | User clicks "Generate Insights" button on any dashboard | 4–6 plain-English observations rendered inline on the dashboard |
| **Loss Debrief** | Closer logs a call with a losing outcome (Offer Declined, Not a Fit) | Root-cause analysis posted to Slack |
| **Anomaly Detection** | Cron job every 4 hours | Slack warning (>20% drop) or critical alert (>35% drop) vs 28-day average |
| **Next Best Action** | On-demand or scheduled | 3–5 urgent priorities rendered on dashboard |
| **Daily Targets** | Cron job each morning | Personalized Slack DM to each closer and setter |
| **Campaign Narratives** | After each Facebook/Instagram ad sync completes | 1–2 sentence summary rendered on Ads dashboard |

## Anomaly thresholds
- Warning: metric drops more than **20%** vs 28-day rolling average
- Critical: metric drops more than **35%** vs 28-day rolling average

## AI coaching personality
Admins can configure the AI coaching tone per dashboard (Settings panel). This affects prompt framing for AI Insights and Loss Debrief.

## TODO
- Shared `generateAIText()` utility (build first, all features call through it)
- Per-feature prompt templates
- Anthropic/OpenAI client setup
