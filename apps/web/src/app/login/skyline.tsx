'use client'

import type { AnimationEvent, MouseEvent } from 'react'

/*
 * Line-art skyline traced from the reference illustration: every building's
 * x-position, width, roof height, gap, and overlap is mapped from measured
 * proportions of the reference photo onto a 760x1060 canvas. Anchored
 * bottom-right so the skyline bleeds off the panel edges like the reference.
 *
 * Gold (#c9a96e) is the primary linework color per the reference treatment;
 * depth comes from stroke-opacity steps, not hue changes.
 *
 * Interaction is a decorative easter egg only (login-page-local, see
 * DESIGN.md deviation note in the page component): hovering a building adds
 * a soft gold outline glow; clicking pulses its window lights once (<500ms).
 * The window columns also carry a slow ambient shimmer, shift a few px in
 * parallax with the card pointer (--plx/--ply from SpotlightCard), and light
 * up in sequence while sign-in is pending (#login-card:has([data-auth-pending])).
 * All of it is disabled under prefers-reduced-motion. Cursor stays default
 * so nothing implies a functional control.
 */

function flourish(e: MouseEvent<SVGGElement>) {
  const g = e.currentTarget
  g.classList.remove('szn-bldg-flourish')
  // force reflow so a rapid re-click restarts the animation
  void g.getBoundingClientRect()
  g.classList.add('szn-bldg-flourish')
}

function settle(e: AnimationEvent<SVGGElement>) {
  e.currentTarget.classList.remove('szn-bldg-flourish')
}

const bldg = {
  className: 'szn-bldg',
  onClick: flourish,
  onAnimationEnd: settle,
}

export function BuildingIllustration() {
  return (
    <>
      <style>{`
        /* ── Night-cycle sky ── */
        @property --sky-tint { syntax: '<color>'; inherits: true; initial-value: #0a0a0f; }
        .szn-sky-bg {
          fill: #0a0a0f;
          transition: fill 15s ease;
        }
        .szn-sky-bg-animate {
          animation: szn-sky-cycle 30s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }
        @keyframes szn-sky-cycle {
          0%, 100% { fill: #0a0a0f; }
          25%      { fill: #0f111a; }
          50%      { fill: #141726; }
          75%      { fill: #0f111a; }
        }

        .szn-bldg {
          cursor: default;
          transition:
            filter 250ms cubic-bezier(0.25, 1, 0.5, 1),
            transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
          transform: perspective(800px)
            rotateX(calc(var(--ply, 0) * var(--d, 0.4)deg))
            rotateY(calc(var(--plx, 0) * var(--d, 0.4)deg))
            translateZ(calc(var(--plx, 0) * var(--z, 0) * 1px));
          will-change: transform;
        }
        .szn-bldg:hover {
          filter: drop-shadow(0 0 6px rgba(201, 169, 110, 0.45))
            drop-shadow(0 0 16px rgba(201, 169, 110, 0.2));
        }
        .szn-sky {
          transform: translate3d(calc(var(--plx, 0) * 6px), calc(var(--ply, 0) * 4px), 0) scale(1.02);
          transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .szn-win {
          opacity: var(--wo, 0.55);
          animation: szn-win-ambient var(--wd, 8s) ease-in-out var(--wdel, 0s) infinite;
        }
        @keyframes szn-win-ambient {
          0%, 100% { opacity: var(--wo, 0.55); }
          50% { opacity: calc(var(--wo, 0.55) + 0.14); }
        }
        /* Sign-in cinematic: while auth is pending the city comes online,
          * window columns lighting up in sequence behind the gold sweep. */
        #login-card:has([data-auth-pending]) .szn-win {
          animation: szn-win-on 460ms cubic-bezier(0.22, 1, 0.36, 1)
            calc(480ms + var(--wi, 0) * 110ms) both;
        }
        @keyframes szn-win-on {
          to { opacity: 1; }
        }
        @keyframes szn-win-pulse {
          0% { opacity: var(--wo, 0.55); }
          30% { opacity: 1; }
          100% { opacity: var(--wo, 0.55); }
        }
        @keyframes szn-glow-pulse {
          0% {
            filter: drop-shadow(0 0 6px rgba(201, 169, 110, 0.45));
          }
          35% {
            filter: drop-shadow(0 0 10px rgba(201, 169, 110, 0.75))
              drop-shadow(0 0 22px rgba(201, 169, 110, 0.35));
          }
          100% {
            filter: drop-shadow(0 0 6px rgba(201, 169, 110, 0.45));
          }
        }
        .szn-bldg-flourish {
          animation: szn-glow-pulse 420ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .szn-bldg-flourish .szn-win {
          animation: szn-win-pulse 420ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .szn-sky,
          .szn-sky-bg,
          .szn-bldg {
            transition: none;
          }
          .szn-sky-bg-animate {
            animation: none;
            fill: #0a0a0f;
          }
          .szn-bldg {
            transform: none;
          }
          .szn-bldg:hover {
            filter: none;
          }
          .szn-win,
          .szn-bldg-flourish,
          .szn-bldg-flourish .szn-win {
            animation: none;
          }
        }
      `}</style>

      <svg
        viewBox="0 0 760 1060"
        className="szn-sky absolute inset-0 h-full w-full"
        preserveAspectRatio="xMaxYMax slice"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="hatch-a"
            patternUnits="userSpaceOnUse"
            width="9"
            height="9"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="9" stroke="#c9a96e" strokeOpacity="0.26" strokeWidth="1.6" />
          </pattern>
          <pattern
            id="hatch-b"
            patternUnits="userSpaceOnUse"
            width="10"
            height="10"
            patternTransform="rotate(-45)"
          >
            <line x1="0" y1="0" x2="0" y2="10" stroke="#c9a96e" strokeOpacity="0.2" strokeWidth="1.6" />
          </pattern>
        </defs>

        {/* Night-cycle sky background rectangle */}
        <rect x="0" y="0" width="760" height="1060" className="szn-sky-bg szn-sky-bg-animate" />

        {/* Trees left — dark canopies, gold trunk marks (non-interactive) */}
        <g pointerEvents="none">
          <g fill="#080808" stroke="#c9a96e" strokeOpacity="0.18" strokeWidth="2">
            <circle cx="155" cy="967" r="39" />
            <circle cx="206" cy="1006" r="31" />
          </g>
          <g stroke="#c9a96e" strokeOpacity="0.75" strokeWidth="2.5" strokeLinecap="round">
            <line x1="155" y1="1060" x2="155" y2="1004" />
            <line x1="155" y1="1014" x2="143" y2="994" />
            <line x1="155" y1="1002" x2="167" y2="984" />
            <line x1="206" y1="1060" x2="206" y2="1034" />
          </g>
        </g>

        {/* Far-left tall leaning tower (behind), diagonal hatch — depth 0.6 */}
        <g {...bldg} style={{ ['--d' as string]: '0.6', ['--z' as string]: '-2' }}>
          <path
            d="M0 1060 L40 621 L152 615 L152 1060"
            fill="url(#hatch-a)"
            stroke="#c9a96e"
            strokeOpacity="0.5"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>

        {/* Short front building at the leaning tower's base — depth 1.2 */}
        <g {...bldg} style={{ ['--d' as string]: '1.2', ['--z' as string]: '4' }}>
          <path d="M10 1060 L10 812 L170 812 L170 1060" fill="#111111" stroke="none" />
          <path
            d="M10 1060 L10 812 L170 812 L170 1060"
            fill="#ffffff"
            fillOpacity="0.04"
            stroke="#c9a96e"
            strokeOpacity="0.55"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M10 1060 L10 812 L170 812 L170 1060" fill="url(#hatch-a)" stroke="none" />
        </g>

        {/* Mid tower with dashed gold window columns — depth 0.8 */}
        <g {...bldg} style={{ ['--d' as string]: '0.8', ['--z' as string]: '-1' }}>
          <path
            d="M221 1060 L221 601 L330 601 L330 1060"
            fill="#ffffff"
            fillOpacity="0.02"
            stroke="#c9a96e"
            strokeOpacity="0.55"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {[248, 276, 304].map((x, i) => (
            <line
              key={x}
              className="szn-win"
              style={{
                ['--wi' as string]: i,
                ['--wdel' as string]: `${(-2.3 * i).toFixed(1)}s`,
                ['--wd' as string]: `${8 + (i % 3) * 1.5}s`,
              }}
              x1={x}
              y1={624}
              x2={x}
              y2={1050}
              stroke="#c9a96e"
              strokeWidth="2"
              strokeDasharray="10 8"
            />
          ))}
        </g>

        {/* Short front building overlapping the mid tower — depth 1.0 */}
        <g {...bldg} style={{ ['--d' as string]: '1.0', ['--z' as string]: '3' }}>
          <path d="M314 1060 L314 881 L414 881 L414 1060" fill="#111111" stroke="none" />
          <path
            d="M314 1060 L314 881 L414 881 L414 1060"
            fill="#ffffff"
            fillOpacity="0.05"
            stroke="#c9a96e"
            strokeOpacity="0.6"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M314 1060 L314 881 L414 881 L414 1060" fill="url(#hatch-b)" stroke="none" />
        </g>

        {/* Hero tower — gold, tallest, depth 0.4 (most distant) */}
        <g {...bldg} style={{ ['--wo' as string]: '0.7', ['--d' as string]: '0.4', ['--z' as string]: '-3' }}>
          <path
            d="M474 1060 L474 445 L626 445 L626 1060"
            fill="#c9a96e"
            fillOpacity="0.09"
            stroke="#c9a96e"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {[500, 534, 568, 602].map((x, i) => (
            <line
              key={x}
              className="szn-win"
              style={{
                ['--wi' as string]: i + 3,
                ['--wdel' as string]: `${(-2.3 * (i + 3)).toFixed(1)}s`,
                ['--wd' as string]: `${8 + ((i + 3) % 3) * 1.5}s`,
              }}
              x1={x}
              y1={470}
              x2={x}
              y2={1050}
              stroke="#c9a96e"
              strokeWidth="2"
              strokeDasharray="11 9"
            />
          ))}
        </g>

        {/* Tall right tower — depth 0.7 */}
        <g {...bldg} style={{ ['--d' as string]: '0.7', ['--z' as string]: '-1' }}>
          <path
            d="M628 1060 L628 582 L725 582 L725 1060"
            fill="url(#hatch-b)"
            stroke="#c9a96e"
            strokeOpacity="0.5"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>

        {/* Edge building, cropped — depth 0.5 */}
        <g {...bldg} style={{ ['--d' as string]: '0.5', ['--z' as string]: '-2' }}>
          <path
            d="M725 1060 L725 678 L760 678"
            fill="url(#hatch-a)"
            stroke="#c9a96e"
            strokeOpacity="0.45"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>

        {/* Trees right — front layer, depth 1.4 (non-interactive) */}
        <g pointerEvents="none">
          <g fill="#080808" stroke="#c9a96e" strokeOpacity="0.18" strokeWidth="2">
            <circle cx="639" cy="957" r="46" />
            <circle cx="726" cy="995" r="43" />
          </g>
          <g stroke="#c9a96e" strokeOpacity="0.75" strokeWidth="2.5" strokeLinecap="round">
            <line x1="639" y1="1060" x2="639" y2="1001" />
            <line x1="639" y1="1011" x2="625" y2="989" />
            <line x1="726" y1="1060" x2="726" y2="1036" />
          </g>
        </g>
      </svg>
    </>
  )
}
