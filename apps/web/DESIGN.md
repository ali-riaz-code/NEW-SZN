---
name: NEW SZN
description: Agency performance dashboard — where closers are held accountable and every number tells a story
colors:
  agency-gold: "#c9a96e"
  agency-gold-hover: "#b8975c"
  deep-black: "#0a0a0a"
  panel-black: "#111111"
  label-gray: "#6b7280"
  muted-gray: "#4b5563"
  data-gray: "#9ca3af"
  body-gray: "#d1d5db"
  signal-green: "#4ade80"
  success-surface: "#0b2a17"
  signal-red: "#f87171"
  error-surface: "#2a0b0b"
  signal-amber: "#f59e0b"
  warning-surface: "#2a1f0b"
  gold-surface: "#2a230b"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "normal"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "normal"
  eyebrow:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.1em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "12px"
  md: "20px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.agency-gold}"
    textColor: "#000000"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.agency-gold-hover}"
    textColor: "#000000"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.panel-black}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  trend-badge-up:
    backgroundColor: "{colors.success-surface}"
    textColor: "{colors.signal-green}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  trend-badge-down:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.signal-red}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  outcome-badge-won:
    backgroundColor: "{colors.success-surface}"
    textColor: "{colors.signal-green}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  outcome-badge-lost:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.signal-red}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  outcome-badge-warning:
    backgroundColor: "{colors.warning-surface}"
    textColor: "{colors.signal-amber}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: NEW SZN

## 1. Overview

**Creative North Star: "The Scoreboard"**

NEW SZN is built for the moment you open a dashboard and immediately know where you stand. Competition is the interface. Revenue, close rate, pacing against goal — every number is a score. Red means behind. Green means winning. The UI does not editorialize, soften, or celebrate prematurely. It reports.

The aesthetic derives from that purpose: near-black surfaces (`#0a0a0a`), dark panel cards (`#111111`), one gold accent (`#c9a96e`) that marks the brand and the most important data points. No gradients, no decorative shadows, no animation for its own sake. Density is a feature — every metric visible without scrolling is a design win. The Scoreboard holds everything that matters.

Anti-references are clear: not Notion or Linear's sparse gray (this system is dense, not minimalist), not generic SaaS blue-sidebar beige (this is not a CRM), not crypto neon-on-black (this tracks real money, not hype). The reference is Vercel and Linear's dark mode polish: deliberate typography, restrained accent, surfaces that feel built rather than generated.

**Key Characteristics:**
- Near-black ground with one-step dark-panel layering — no shadows, pure tonal depth
- Single gold accent used with restraint: chart lines, brand mark, primary actions, AI triggers
- Semantic state vocabulary: green (winning), amber (watch), red (behind), gold (distinctive/brand)
- Inter throughout — one family, full weight range from 400 to 700, no display/body split needed
- Density over airiness — data that fits without scrolling beats data that breathes

## 2. Colors: The Scoreboard Palette

A high-contrast, dark-first palette built for accountability. One gold accent carries the brand; semantic states carry meaning.

### Primary
- **Agency Gold** (`#c9a96e`): The Scoreboard's single accent. The currency of performance. Used on: brand mark in the nav, sparkline strokes and end dots, chart lines, primary action buttons (AI triggers, Refresh), AI Insights bullet markers, numbered priority list items, and the DRAG_OVER_SHOW outcome state. Its hover form (`#b8975c`) is one step darker and warmer. Where you see gold, something has been earned or something demands attention.

### Neutral
- **Deep Black** (`#0a0a0a`): Page body background. The lowest layer — the floor everything sits on.
- **Panel Black** (`#111111`): Card and container background. The only elevation step used at scale. One step above the floor.
- **Micro Surface** (approx. `#0d0d0d` / `rgba(255,255,255,0.03)`): Tertiary surface for sub-items (objection counter cells, interactive sub-surfaces). Barely visible — used when a card needs internal grouping without introducing another full tone.
- **Body Gray** (`#d1d5db`): Secondary body text, AI Insights observation copy, table cell text where secondary emphasis is appropriate.
- **Data Gray** (`#9ca3af`): Table secondary values (counts, percentages), closer names. Recedes behind primary data without disappearing.
- **Label Gray** (`#6b7280`): Section eyebrows, metric labels, muted chart axis labels. The system's whisper level.
- **Muted Gray** (`#4b5563`): Empty state copy, SVG axis labels. Not meant to be read easily — acts as visual placeholder.
- **Primary White** (`#ffffff`): KPI values, lead names, primary table text. The most important number is always white.

### Semantic States
- **Signal Green** (`#4ade80`) on **Success Surface** (`#0b2a17`): Won deals (CLOSED_PIF, CLOSED_SPLIT_PAY, CLOSED_DEPOSIT), positive trend badges. Earned color — never decorative.
- **Signal Red** (`#f87171`) on **Error Surface** (`#2a0b0b`): No-fit outcomes, negative trend badges. Warning color.
- **Signal Amber** (`#f59e0b`) on **Warning Surface** (`#2a1f0b`): Declined offers (OFFER_DECLINED), mid-performance signals. Watch color.
- **Agency Gold** (`#c9a96e`) on **Gold Surface** (`#2a230b`): DRAG_OVER_SHOW outcomes. Reuses the brand accent for semantic meaning — shows that persist.
- **Neutral Outcome** (`rgba(255,255,255,0.06)` bg, `#9ca3af` text): No-shows, cancelled, rescheduled. Gray because nothing notable happened.

**The One Accent Rule.** Agency Gold (`#c9a96e`) appears on ≤10% of any given screen. Charts need it. The brand mark needs it. Buttons need it. Everything else uses semantic state colors or grays. Gold is not a decoration color — it is a signal color. Diluting it by using it as a hover tint, border accent, or background wash destroys its meaning. If you're asking "should this be gold?" the answer is almost certainly no.

**The Tonal Layering Rule.** Depth is created by tone, not shadow. `#0a0a0a` → `#111111` → `rgba(255,255,255,0.03–0.08)`. Never add `box-shadow` to a resting card. Shadows appear only as a deliberate state effect — the accountability lock overlay's `shadow-2xl` is the system's one shadow, used to lift the overlay above blurred content.

## 3. Typography

**Display/Body Font:** Inter (Google Fonts, subset: latin), system-ui fallback.
**No pairing required.** Inter carries this system's full range — from 10px eyebrow labels to 30px KPI values — without a second family.

**Character:** Precise, legible, low visual weight. Inter's geometry serves data display: numerals are distinctive, weights contrast cleanly (400 vs. 700 is the main axis), and it reads clearly at both 10px and 30px. Single-family product UI — the typeface disappears into the task.

### Hierarchy
- **Display** (700 weight, 30px, line-height 1): KPI primary values — revenue, deals, calls taken. The number the user came to see. Always white.
- **Headline** (700 weight, 24px, line-height 1.1): Secondary metric values on sales cards where a smaller step is appropriate.
- **Title** (600 weight, 16px, line-height 1.25): Reserved for section headings when needed. Used sparingly.
- **Body** (400 weight, 14px, line-height 1.5): Table cell text, AI Insights observation copy, form labels, narrative copy. Cap at 65–75ch for prose.
- **Label** (500 weight, 12px, line-height 1): Button text, trend badge values, nav link text, sub-labels.
- **Eyebrow** (600 weight, 10px, letter-spacing 0.1em, uppercase): Card section headers — "TOTAL REVENUE", "CLOSER LEADERBOARD", "AI INSIGHTS". Established pattern; maintain it on new cards.

**The Data-First Rule.** KPI values (Display, Headline) are always white (`#ffffff`). Supporting context is always gray. The number is the signal; the label is the whisper. Never invert this: don't use colored text for primary values unless it carries semantic meaning (green = won, red = behind, gold = brand-specific state).

**The Single Family Rule.** Inter only. Do not introduce a second typeface — not a serif for headings, not a mono for data, not a display font for brand moments. This system's typographic range comes from weight variation, not family contrast. One font, used precisely.

## 4. Elevation

This system is flat by default. All depth comes from tonal layering, not shadows. There are exactly two elevation layers in normal use:

- **Ground** (`#0a0a0a`): Page background. The Scoreboard's floor.
- **Panel** (`#111111`): Cards, charts, all data containers. One step above ground. Every card shares this background.

There are no ambient shadows on cards. No lift on hover. No blur-backdrop on content (only the nav uses `backdrop-filter: blur`, functionally — to keep it legible as content scrolls beneath it).

**The One Shadow Rule.** `box-shadow: 0 25px 50px -12px rgba(0,0,0,0.9)` (`shadow-2xl`) appears once in the entire codebase: on the accountability lock overlay card. This shadow lifts the overlay above the blurred content beneath it. That's the only legitimate use. Any proposed new shadow must justify the same level of functional necessity before it ships.

**The Flat-By-Default Rule.** If you're adding a card to this system and you're reaching for `box-shadow`, stop. The card doesn't need it — the tonal contrast between `#111111` and `#0a0a0a` already reads as elevation. Shadows are a trust tax: every one you add costs visual focus that could go to data.

## 5. Components

### Buttons

One gold button drives every primary action in the authenticated dashboard. No secondary or ghost buttons exist in the main UI — interactive elements not needing a button use links or inline controls.

- **Shape:** Gently rounded corners (8px / `rounded-lg`)
- **Primary:** Agency Gold (`#c9a96e`) background, black text (`#000000`), 12px font, 600 weight, `px-4 py-2`. Used for: AI triggers ("Get AI Insights", "Get Priorities"), data operations ("Refresh", "Sync Ads").
- **Hover:** `#b8975c` — one step darker. `transition-colors` at 150ms.
- **Disabled:** 40% opacity (`opacity-40`). Color unchanged — the button grays out in place, not to a different color.
- **Focus:** 2px `#c9a96e` outline at 2px offset.
- **Auth Button (to be migrated):** Currently `bg-violet-600`. The design decision is to migrate this to Agency Gold to unify the product accent. Until migrated, document it as a known inconsistency.

### Cards / Data Containers

The system's structural workhorse. Every metric, chart, table, and AI panel lives inside one.

- **Corner Style:** Large rounding (16px / `rounded-2xl`)
- **Background:** Panel Black (`#111111`)
- **Shadow:** None. See Elevation.
- **Border:** None at rest. `border-white/10` appears only on the accountability lock overlay as a raised exception.
- **Internal Padding:** 20px (`p-5`) — consistent across all cards. Do not vary this without purpose.
- **Header Pattern:** Every card uses an eyebrow label (10px, uppercase, tracking-widest, `#6b7280`) at top-left, with any inline controls (buttons, stat values) at top-right. This is the established contract — maintain it on any new cards.
- **Min Height:** KPI cards use `min-h-[168px]` (168px) to ensure consistent grid sizing. Sales sub-metric cards use `min-h-[130px]` (130px). Set a min-height when cards appear in a grid alongside other cards.

### Inputs / Fields

Used on auth screens and the Log Call / Log Day forms.

- **Style:** Semi-transparent dark surface (`rgba(255,255,255,0.05)` bg), subtle white border (`rgba(255,255,255,0.08)`), 8px radius.
- **Focus:** Border shifts to `rgba(201,169,110,0.4)` (Agency Gold at low opacity), background lightens to `rgba(255,255,255,0.07)`. **Note:** Current codebase uses violet (`rgba(124,58,237,0.4)`) for the focus ring — this is the inconsistency to migrate.
- **Placeholder:** `rgba(255,255,255,0.3)` — low opacity but sufficient contrast against the dark input surface.
- **Error:** `text-red-400/80` message below the field.

### Navigation

Sticky top bar, horizontally scrollable on narrow screens.

- **Background:** `rgba(10,10,10,0.95)` with `backdrop-filter: blur(8px)` — the one legitimate use of blur in the system.
- **Bottom Border:** `rgba(255,255,255,0.06)` — the system's lightest border, separating the nav from content without demanding attention.
- **Brand Mark:** "NEW SZN" in Agency Gold (`#c9a96e`), 14px, `font-bold tracking-tight`. The only gold text element in the nav.
- **Default Link:** Label Gray (`#6b7280`), 12px medium. Hovers to Body Gray (`#d1d5db`), 150ms transition.
- **Active Link:** White (`#ffffff`) on `rgba(255,255,255,0.08)` pill background, 8px radius.

### Trend Badge

Inline state indicator for KPI directional movement.

- **Shape:** Fully rounded pill (9999px), `px-2 py-0.5`.
- **Up:** Signal Green (`#4ade80`) on Success Surface (`#0b2a17`). Arrow glyph `↑` at 10px + percentage at 12px.
- **Down:** Signal Red (`#f87171`) on Error Surface (`#2a0b0b`). Arrow glyph `↓` at 10px + percentage at 12px.
- **Weight:** 600 (semibold). The trend is a statement, not a whisper.

### Sparkline (Signature Component)

Lightweight inline SVG trend visualization embedded in KPI cards, immediately below the value.

- **Stroke:** Agency Gold (`#c9a96e`), 1.5px, `stroke-linecap: round`, `stroke-linejoin: round`.
- **End Dot:** Filled circle, 2.5px radius. Same gold. Marks the current data point.
- **No axes, no labels, no grid.** The sparkline communicates direction only. The number above it carries the value; the chart carries the shape.
- **Flat fallback:** A single horizontal line at mid-height when fewer than 2 data points exist.

### Outcome Badge

Semantic state pill in call log tables. The full state vocabulary:

- **Won** (green family): `#0b2a17` bg, `#4ade80` text — CLOSED_PIF, CLOSED_SPLIT_PAY, CLOSED_DEPOSIT
- **Declined** (amber): `#2a1f0b` bg, `#f59e0b` text — OFFER_DECLINED
- **No-fit** (red): `#2a0b0b` bg, `#f87171` text — NOT_A_FIT
- **Neutral** (gray): `rgba(255,255,255,0.06)` bg, `#9ca3af` text — NO_SHOW, CANCELLED, RESCHEDULED
- **Gold** (brand): `#2a230b` bg, `#c9a96e` text — DRAG_OVER_SHOW

Shape: 9999px radius, `text-[10px] font-semibold`, `px-2 py-0.5`. Same pill form as Trend Badge.

### Goal Progress Bar

Thin horizontal progress indicator anchored to the bottom of KPI cards.

- **Height:** 2px — whisper-level. The bar communicates without demanding.
- **Track:** `#1f2937` (gray-800) — near-invisible against the card surface.
- **Fill (Green):** `#22c55e` — on-track.
- **Fill (Amber):** `#f59e0b` — approaching threshold.
- **Fill (Red):** `#ef4444` — behind.
- **Thresholds are always admin-configurable.** The green/amber/red bands are set per client in Settings. Never hardcode these logic boundaries in the UI.

## 6. Do's and Don'ts

### Do:
- **Do** keep Agency Gold (`#c9a96e`) rare. One chart line, one brand mark, primary action buttons, AI triggers. Every additional gold usage dilutes its signal value.
- **Do** use tonal layering for depth: `#0a0a0a` ground → `#111111` panels → `rgba(255,255,255,0.03–0.08)` micro-surfaces. Never add `box-shadow` to a resting card or container.
- **Do** use the semantic state palette consistently: green family for wins, red for losses, amber for warnings. These colors carry meaning — using them decoratively breaks the vocabulary.
- **Do** keep primary KPI values in white (`#ffffff`). The number is the signal. Never downgrade it to gray or color-code it unless the color carries semantic meaning.
- **Do** keep cards at Panel Black (`#111111`) background, 16px radius, 20px padding. New data containers match this pattern exactly. Consistency is trust.
- **Do** migrate auth screens (login, forgot password, reset password) to use Agency Gold for primary actions and focus rings. The current violet (`#7c3aed`) is a known inconsistency; the design decision is to unify under one accent.
- **Do** use Inter exclusively at every type size. One family, multiple weights.
- **Do** maintain the eyebrow label pattern (10px, uppercase, tracking-widest, Label Gray) at the top of every card and table section. It is the system's established heading convention.
- **Do** treat the accountability lock/blur on the Sales dashboard as intentional. It is the product's core accountability mechanic. Never remove it.
- **Do** pull goal progress thresholds from the API. They are admin-configurable per client.

### Don't:
- **Don't** use Agency Gold as a hover tint, border stripe, or background wash on neutral surfaces. Gold is reserved for: brand mark, chart data, primary buttons, AI triggers, semantic gold state (DRAG_OVER_SHOW). Everywhere else uses gray.
- **Don't** add `box-shadow` to cards, panels, or containers at rest. The one shadow in this system is on the accountability lock overlay — and that's a deliberate state exception.
- **Don't** add decorative motion. No entrance animations, no hover lifts, no loading choreography. Motion conveys state only: form submission, button loading, data transition. Product UI guideline: 150–250ms on transitions, nothing else.
- **Don't** make the interface feel like Notion or Linear minimal — sparse, gray, desktop-minimal. Density is a feature. If data fits without scrolling, that's the win.
- **Don't** make the interface feel like generic SaaS (blue sidebar, white cards, dropdowns everywhere). The palette is dark and the accent is gold for a reason. Those decisions are identity.
- **Don't** make the interface feel like crypto/DeFi dashboard aesthetics — neon borders, glowing elements, animated gradients. This tracks real money and real performance. Credibility over hype.
- **Don't** add a second typeface. No serif display headings, no mono data labels. Inter handles it all.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored stripe on cards, list items, or callouts. The system has no side-stripe borders.
- **Don't** use gradient text (`background-clip: text` + gradient). Emphasis is weight or color, never gradients.
- **Don't** invent shadow vocabulary. If you're adding a new shadow, that's a system-level decision — not a component-level one.
- **Don't** hardcode goal progress thresholds. Green/amber/red bands are admin-configurable per client. The API is the source of truth.
