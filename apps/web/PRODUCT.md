# Product

## Register

product

## Users

Four role tiers operating under real performance pressure:

- **Admin** — agency leadership. Command-center view of all clients, all metrics. Checking progress against monthly goals, spotting underperformance, managing team.
- **Closer** — salespeople. Their job is on the leaderboard. They open the dashboard to see their own numbers, log calls, and understand why they're winning or losing.
- **Setter** — appointment bookers. Daily rhythm of outreach activity. They log each day and track whether their pipeline is healthy.
- **Client** — read-only. Business owners or brand contacts checking their agency's performance. They expect polish, not a raw ops tool.

Context of use: high-stakes environments. Closers check before calls. Admins check at end of day. Numbers carry weight.

## Product Purpose

Production SaaS performance dashboard for digital marketing agencies. Live with real customer data (30+ clients, 2,000+ logged calls, 50+ ad campaigns). Gives agencies and their teams real-time visibility into revenue, ad performance, sales activity, and appointment setting — all in one place.

Success looks like: every user opens the dashboard and immediately knows where they stand. No hunting, no ambiguity. The number is there, the trend is there, the context is there.

A public-facing brand/marketing surface is planned (future scope). PRODUCT.md covers the product dashboard as the primary surface; brand work will extend, not contradict, these principles.

## Brand Personality

Sharp. Relentless. Results-first.

The feeling of a high-performance analytics room where everyone knows the score. Urgency is baked into the interface, not added by copy. Precision over decoration. The UI looks like a tool used by people who take performance seriously — not consumer-grade, not enterprise-beige.

Tone: confident and direct. Numbers speak; the UI doesn't editorialize. When something is red, it's red.

References: Vercel dark mode, Linear dark mode — polished typographic hierarchy on dark surfaces, never sparse or washed-out gray.

## Anti-references

- **Notion / Linear minimal (gray wash)** — avoid ultra-sparse, all-gray, desktop-app feel. Density is a feature; every metric visible without scrolling is a win.
- **Generic SaaS (HubSpot / Salesforce)** — blue sidebar, white cards, endless dropdowns. The enterprise-beige family is the wrong neighborhood.
- **Crypto / dark hype** — neon borders, glowing elements, hype aesthetics don't belong in a tool where real money is tracked.

## Design Principles

1. **Data speaks first.** Numbers are the hero. Decoration earns its place by serving the signal. Never reverse this hierarchy.
2. **Accountability is the feature.** The interface reflects competitive reality: who's winning, who's behind, by how much. The UI does not soften that. Leaderboards, trend arrows, and red indicators are intentional design decisions, not problems to fix.
3. **Edge breeds trust.** Dark, precise, high-contrast. Looks like a tool serious people use. The gold accent (`#c9a96e`) is the one concession to warmth — it marks the brand without softening the tone.
4. **Complexity arrives with context.** Each role sees exactly what they need. The interface adapts to the user's job, not the other way around. Cognitive load scales with authority.
5. **Motion is a signal, not decoration.** Animate state changes. Don't animate structure. Every transition communicates something (loading, success, warning) or it doesn't run.

## Accessibility & Inclusion

Best-effort standard: strong color contrast for body text (target WCAG AA minimums), full keyboard navigation, screen-reader-friendly landmark structure. No formal audit target, but dark themes carry inherent contrast risk — validate text on dark card surfaces. Reduced motion respected via `prefers-reduced-motion`.
