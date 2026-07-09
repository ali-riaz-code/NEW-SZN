import type { Metadata } from 'next'
import { LogoMark } from '@/components/icons'
import { LoginForm } from './login-form'
import { SpotlightCard } from './spotlight'
import { BuildingIllustration } from './skyline'

export const metadata: Metadata = { title: 'Sign in — NEW SZN' }

/*
 * DESIGN.md deviations, deliberately page-local per the reference treatment
 * (do NOT propagate to the global system):
 *  - Pill (fully rounded) button + inputs — global buttons stay 8px radius.
 *  - Gold carries the illustration linework, exceeding the ≤10% accent rule.
 *  - Decorative motion beyond state changes: skyline hover/click flourish,
 *    ambient window shimmer, pointer spotlight/parallax, entrance stagger,
 *    and the sign-in cinematic (gold sweep + skyline light-up). All of it
 *    is reduced-motion aware and none of it gates content visibility.
 */

/* Faint gold line-art fragments on the page ground, clipped behind the card
 * like the reference: chevrons on the left edge, skyline traces at bottom. */
function GroundLineArt() {
  return (
    <svg
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <g fill="none" stroke="#c9a96e" strokeOpacity="0.5" strokeWidth="2.5" strokeLinejoin="round">
        {/* left-edge chevrons */}
        <path d="M-40 200 L96 336 L-40 472" />
        <path d="M-40 296 L52 388 L-40 480" />
        <path d="M-40 540 L120 700 L-40 860" />
        <path d="M-40 660 L60 760 L-40 860" />
        {/* bottom-left building traces */}
        <path d="M60 1000 L60 900 L150 900 L150 1000" />
        <path d="M180 1000 L180 850 L210 850" />
        {/* bottom-right diagonal stripes */}
        <path d="M1520 1000 L1640 880" />
        <path d="M1560 1000 L1640 920" />
        <path d="M1480 1000 L1640 840" />
      </g>
    </svg>
  )
}

export default function LoginPage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      />
      {/* dangerouslySetInnerHTML: quotes in CSS (content: '') get entity-escaped
          when rendered as JSX text, causing a server/client hydration mismatch */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        #login-page {
          --font-body: Inter, sans-serif;
          --easeq: cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* Entrance: each block rises once on load; content is never gated
         * on a class toggle, so it renders visible everywhere. */
        @keyframes szn-rise {
          from { opacity: 0; transform: translateY(12px); }
        }
        .szn-item {
          animation: szn-rise 560ms var(--easeq) both;
          animation-delay: calc(80ms + var(--i, 0) * 70ms);
        }
        .szn-tagline {
          animation: szn-rise 640ms var(--easeq) 200ms both;
        }

        /* Error feedback: sharp 3-cycle shake on the form. */
        @keyframes szn-shake {
          15%, 45%, 75% { transform: translateX(-5px); }
          30%, 60%, 90% { transform: translateX(5px); }
        }
        .szn-shake {
          animation: szn-shake 380ms cubic-bezier(0.36, 0.07, 0.19, 0.97);
        }
        .szn-error-in {
          animation: szn-rise 240ms var(--easeq) both;
        }

        /* Pending: white sheen sweeps the gold button while authenticating. */
        .szn-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, 0.3) 50%, transparent 70%);
        }
        .szn-btn[data-pending]::after {
          animation: szn-btn-sheen 1.15s ease-in-out infinite;
        }
        @keyframes szn-btn-sheen {
          to { transform: translateX(100%); }
        }

        /* Sign-in cinematic: one gold light-sweep crosses the card when
         * auth starts; the skyline windows light up behind it (skyline.tsx). */
        #login-card::after {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 30;
          pointer-events: none;
          background: linear-gradient(100deg, transparent 44%, rgba(201, 169, 110, 0.06) 50%, transparent 56%);
          transform: translateX(-110%);
        }
        #login-card:has([data-auth-pending])::after {
          animation: szn-sweep 1200ms var(--easeq) 60ms both;
        }
        @keyframes szn-sweep {
          to { transform: translateX(110%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .szn-item,
          .szn-tagline,
          .szn-shake,
          .szn-error-in {
            animation: none !important;
          }
          .szn-btn[data-pending]::after,
          #login-card:has([data-auth-pending])::after {
            animation: none;
          }
        }
      `,
        }}
      />

      <div
        id="login-page"
        className="relative flex min-h-screen w-full items-center justify-center bg-black p-5 lg:p-10"
      >
        <GroundLineArt />

        {/* Single rounded card holding both panels on one continuous surface.
             #login-card holds the cinematic CSS selectors (gold sweep + skyline
             light-up); the spotlight overlay is scoped to the right panel only. */}
        <div id="login-card" className="relative z-10 flex min-h-[calc(100dvh-2.5rem)] w-full max-w-[1440px] overflow-hidden rounded-3xl border border-white/[0.06] bg-[#111111] lg:min-h-[calc(100dvh-5rem)]">
          {/* ── Left panel — login form ── */}
          <div className="relative flex w-full flex-col overflow-y-auto lg:w-1/2">
            {/* Logo — fixed top-left, decoupled from the centered form */}
            <div className="absolute left-8 top-8 flex items-center gap-3 lg:left-10 lg:top-10">
              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
                <LogoMark className="h-6 w-auto" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase leading-none tracking-[0.04em] text-white">
                  NEW SZN<sup className="ml-px text-[7px] font-bold">®</sup>
                </p>
                <p className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-gray-500">
                  Agency Performance
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center px-8 py-28 sm:px-12">
              <div className="mx-auto w-full max-w-sm">
                <div className="szn-item text-center" style={{ ['--i' as string]: 0 }}>
                  <h1 className="text-3xl font-bold tracking-[-0.03em] text-white [text-wrap:balance]">
                    Sign in
                  </h1>
                  <p className="mt-3 text-sm leading-normal text-[#9ca3af]">
                    Welcome back. Please enter your details to continue.
                  </p>
                </div>

                <div className="mt-10">
                  <LoginForm />
                </div>

                <p
                  className="szn-item mt-7 text-center text-xs text-white/55"
                  style={{ ['--i' as string]: 4 }}
                >
                  Access is by invitation only.
                </p>
              </div>
            </div>
          </div>

          {/* ── Right panel — slogan + illustration, with spotlight overlay ── */}
          <SpotlightCard className="relative hidden overflow-hidden border-l border-white/[0.04] lg:flex lg:w-1/2">
            <BuildingIllustration />
            {/* Content pinned to top-left of the panel, above the skyline */}
            <div className="relative z-10 flex flex-col pl-4 pr-12 pt-4 pb-16">
              <p
                className="szn-tagline max-w-[28rem] text-[2.5rem] font-bold leading-[1.2] tracking-[-0.025em] text-[#c9a96e] [text-wrap:balance]"
              >
                Built for performance agencies that refuse to plateau
              </p>
              <p
                className="szn-tagline mt-4 max-w-sm text-sm leading-normal tracking-[0.02em] text-[#9ca3af]"
                style={{ animationDelay: '420ms' }}
              >
                Revenue, calls, ads &mdash; one real-time scoreboard your team actually checks.
              </p>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </div>
  )
}
