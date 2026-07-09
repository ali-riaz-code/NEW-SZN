---
target: login page
total_score: 27
p0_count: 0
p1_count: 2
timestamp: 2026-07-08T16-47-15Z
slug: apps-web-src-app-login-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Submit shows "Signing in…" + disabled state; no inline validation feedback before submit |
| 2 | Match System / Real World | 3 | Plain language, standard two-field flow |
| 3 | User Control and Freedom | 3 | "Forgot your password?" is the only (and sufficient) escape hatch for auth |
| 4 | Consistency and Standards | 2 | Gradient background + entrance animation both contradict DESIGN.md's own stated rules |
| 5 | Error Prevention | 2 | Only native HTML5 validation (`required`, `type="email"`); no inline feedback on blur |
| 6 | Recognition Rather Than Recall | 4 | Both fields, both actions, fully visible — nothing hidden |
| 7 | Flexibility and Efficiency | 3 | Native form semantics (Enter submits, natural tab order) are sufficient for a 2-field auth form |
| 8 | Aesthetic and Minimalist Design | 3 | Composition is clean; docked for violating the system's own "flat by default" doctrine |
| 9 | Error Recovery | 2 | Error text renders in the right place but is generic; unclear if field values persist after a failed attempt |
| 10 | Help and Documentation | 2 | "Forgot your password?" is the only help affordance on the page |
| **Total** | | **27/40** | **Acceptable — solid foundation, real spec violations, closeable a11y gaps** |

## Anti-Patterns Verdict

**LLM assessment**: Not AI slop. No side-stripe borders, no gradient text, no glassmorphism, no hero-metric template, no identical card grids, no eyebrow spam. The two-panel layout, the custom line-art building illustration, and the deliberate gold-button migration all read as bespoke work, not template output. The failure mode here isn't genericness — it's **incomplete migration to the project's own design system**: a gradient background and a decorative entrance animation both directly contradict rules DESIGN.md states explicitly ("No gradients, no decorative shadows, no animation for its own sake" / "Don't add decorative motion. No entrance animations").

**Deterministic scan**: `detect.mjs` returned exit code 2 with exactly one finding — `overused-font` (Inter) at page.tsx:100. This is a **false positive**: DESIGN.md explicitly mandates Inter as the system's single typeface ("No pairing required... the typeface disappears into the task"), so the detector's generic "Inter is overused" heuristic doesn't apply here. Notably, **the static scanner did not catch the gradient background or the decorative motion violation** — both were caught only by design review against the project's own DESIGN.md, not by pattern-matching. That's the useful split from this run: the detector validates against generic AI-slop patterns; it can't validate against a project's self-authored rules.

**Visual overlays**: Not available this run — the assessment environment didn't have an interactive/headless browser to inject the live detector into. No overlay is showing in a `[Human]` tab; this is a fallback-signal result, not a clean pass.

## Overall Impression

This is a well-executed, on-brand login page that hasn't fully caught up to its own design system. The bones are right — dark tonal layering, restrained gold, clean two-field form, a genuinely nice custom illustration — but it was built (per memory: multiple redesign passes on 2026-07-08) slightly ahead of full DESIGN.md compliance. The biggest opportunity isn't a redesign, it's a compliance pass: strip the gradient, fix the entrance animation's content-gating risk, and close two real WCAG contrast gaps on the one screen every single user — closer, setter, admin, client — hits before anything else.

## What's Working

1. **Gold button/focus migration is done here.** DESIGN.md flags the auth screens as having a "known inconsistency" (violet accent) still pending migration — but this login page already uses Agency Gold on the submit button and focus states. That migration is complete on this surface even though the doc hasn't caught up.
2. **Form micro-interactions are calibrated correctly.** Pending state ("Signing in…" + `disabled:opacity-40`-style dimming), 150ms color transitions on inputs, error text in the correct position (below the field) — all match the DESIGN.md component spec precisely.
3. **The building illustration is a genuine piece of custom work**, not a stock asset or gradient-mesh placeholder. Gold picks out the center building specifically (implying "the one that matters"), which is a small but real echo of the product's "your numbers, highlighted" philosophy.

## Priority Issues

**[P1] Entrance animation gates the entire form's visibility, with no reduced-motion fallback**
- **Why it matters**: `MotionFade` (motion-fade.tsx) wraps the whole form in `initial={{ opacity: 0, y: 10 }}`, animating to visible over 600ms via Framer Motion. Per the skill's own general rule: "Reveal animations must enhance an already-visible default. Don't gate content visibility on a class-triggered transition." If JS is slow to hydrate, fails, or the page renders in a context where the animation doesn't fire (backgrounded tab, headless render, slow connection), **the login form — the entire reason the page exists — stays invisible.** There is also no `prefers-reduced-motion` alternative, which the project's own accessibility standard requires ("Reduced motion respected via `prefers-reduced-motion`" in PRODUCT.md). This also directly violates DESIGN.md's explicit "No entrance animations" rule under Motion.
- **Fix**: Render the form visible by default (no `opacity: 0` initial state); if you want the fade, do it as a progressive enhancement gated behind a mounted/loaded check rather than the sole visibility mechanism, and add a reduced-motion branch that skips straight to the end state.
- **Suggested command**: `/impeccable harden`

**[P1] Gradient backgrounds violate the system's explicit "no gradients" rule**
- **Why it matters**: page.tsx:145 sets the right panel to `bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]`, and the `BuildingIllustration` SVG itself defines and uses a `linearGradient` fill (lines 16–23). DESIGN.md states plainly in its Overview: "near-black surfaces, dark panel cards, one gold accent... **No gradients**, no decorative shadows, no animation for its own sake." This is the first screen every user of every role sees — inconsistency here undercuts the "same product" feeling the authenticated dashboard works hard to establish through pure tonal layering.
- **Fix**: Replace the panel gradient with a solid `#0a0a0a` or `#111111`. Replace the SVG's gradient fill with a flat `#0a0a0a` rect — the illustration's linework contrast will read fine against a flat ground; the gradient isn't adding legibility, just texture the system doesn't want.
- **Suggested command**: `/impeccable polish`

**[P2] Focus-state and link contrast fall short of WCAG guidance on the highest-stakes screen in the product**
- **Why it matters** (corrected figures — Assessment A's initial numbers were off, recomputed against actual hex/opacity values): the gold focus ring (`ring-[#c9a96e]/20`) against the `#0a0a0a` page background computes to **~1.4:1**; the focus border (`border-[#c9a96e]/50`) computes to **~2.9:1** — both under the 3:1 WCAG 1.4.11 non-text contrast floor for UI component states. The "Forgot your password?" link (`text-white/40`) computes to **~3.8:1** against `#0a0a0a`, under the 4.5:1 body-text floor (it is not large/bold text, so the 3:1 large-text exception doesn't apply). Note: the input's label text (`text-white/60`) is actually fine at **~7.3:1** — that one's a non-issue despite being flagged initially. Every user, every role, hits this screen before anything else in the product; a keyboard-only or low-vision user with a weak focus indicator here is a bad first impression of an otherwise-careful system.
- **Fix**: Bump the focus ring/border opacity (e.g., ring to ~40%, border to ~70%) until both clear 3:1, or add a secondary indicator (background lighten is already present in the input focus-state spec, which helps — lean on it more). Raise the "Forgot your password?" link to `white/60` or higher (comfortably passes at ~7.3:1).
- **Suggested command**: `/impeccable audit`

**[P2] Submit button padding deviates from the documented `button-primary` token**
- **Why it matters**: DESIGN.md's `button-primary` component spec is `padding: "8px 16px"` (`py-2`), but the login submit button uses `py-3` (12px vertical). Minor alone, but this is the single primary CTA on the page, and DESIGN.md calls out "same button looks different in two places, one is wrong" as exactly the kind of drift the system exists to prevent.
- **Fix**: Either align to `py-2` for token consistency, or — if the larger touch target is intentional for a solo-CTA auth screen — document that exception in DESIGN.md so it reads as a decision, not drift.
- **Suggested command**: `/impeccable polish`

**[P3] The building illustration is polished but doesn't say "agency performance dashboard" specifically**
- **Why it matters**: A gold-accented line-art skyline is well-crafted, but it's a motif that could sit on almost any B2B SaaS login page. It doesn't reinforce the specific "Scoreboard" identity (numbers, pacing, leaderboards) that defines the rest of the product.
- **Fix**: Optional. Consider working a subtle data/metric motif into the illustration (a pacing line, a small numeric mark) so the login page previews the product's actual visual language, not just its palette.
- **Suggested command**: `/impeccable delight`

## Persona Red Flags

**Sam (Accessibility-Dependent User)**: The focus ring on both inputs falls under the WCAG 1.4.11 non-text contrast floor (~1.4:1 ring, ~2.9:1 border vs. the 3:1 minimum) — a keyboard-only user tabbing through the form gets a materially weaker visual anchor than the rest of the product provides. The "Forgot your password?" link at ~3.8:1 also falls short of the 4.5:1 body-text floor. Neither is invisible, but both are measurably below spec on the one page every screen-reader/keyboard user must clear before reaching anything else.

**Alex (Power User)**: The 600ms mandatory fade-in on every page load adds a small but real tax to a high-frequency action — closers check dashboards "before every call" per PRODUCT.md, meaning this animation plays dozens of times a month for the same user with zero payoff after the first viewing. Not blocking, but pure friction with no `prefers-reduced-motion` escape.

**Jordan (First-Timer)**: "Access is by invitation only" is a deliberate, sensible gate (not a flaw) — but paired with a purely decorative illustration and a vague "Agency Performance" tagline, a first-time user gets no hint of what they're about to see after signing in. Low risk since these users arrive via an admin invite with prior context, but worth noting as the page currently sells nothing about the product itself.

## Minor Observations

- Logo container border (`border-white/[0.06]`) is extremely faint — barely visible at typical viewing distance; consider `border-white/[0.08]`–`[0.10]` if it's meant to read as a deliberate frame.
- Placeholder text (`placeholder:text-white/50`) actually exceeds DESIGN.md's own spec value of `rgba(255,255,255,0.3)` and is more readable as a result (~5.3:1) — this is a positive deviation, not a bug.
- No inline "invalid email format" feedback before submit; relies entirely on native browser validation. Acceptable for a 2-field form but worth a follow-up if error-recovery scores need to improve.
- Right-panel illustration is correctly hidden below `lg:` breakpoint (`hidden lg:flex`) — good mobile behavior, no wasted asset weight on small screens.

## Questions to Consider

- The gradient and the entrance animation both look like intentional craft decisions (they're well-executed, not sloppy) rather than oversights — were they a deliberate exception for the login page specifically, or drift from an earlier design pass that predates the current DESIGN.md? Worth deciding explicitly either way, since "exception, documented" and "drift, unnoticed" call for opposite fixes.
- DESIGN.md already flags auth screens as having a pending violet-to-gold migration — this page has clearly moved past that note. Is it time to update DESIGN.md's own "Auth Button (to be migrated)" caveat, since the gold migration is done here?
- Is "Access is by invitation only" the whole story for a first-time visitor, or should there be a lightweight "contact your admin" affordance for someone who lands here without credentials?
