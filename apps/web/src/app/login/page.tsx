import type { Metadata } from 'next'
import { LogoMark } from '@/components/icons'
import { LoginForm } from './login-form'
import { MotionFade } from './motion-fade'

export const metadata: Metadata = { title: 'Sign in — NEW SZN' }

/*
 * Line-art skyline traced from the reference illustration: every building's
 * x-position, width, roof height, gap, and overlap is mapped from measured
 * proportions of the reference photo onto a 760x1060 canvas. Anchored
 * bottom-right so the skyline bleeds off the panel edges like the reference.
 * Verified visually by rasterizing this exact geometry to PNG.
 */
function BuildingIllustration() {
  return (
    <svg
      viewBox="0 0 760 1060"
      className="absolute inset-0 h-full w-full"
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
          <line x1="0" y1="0" x2="0" y2="9" stroke="#333333" strokeWidth="1.6" />
        </pattern>
        <pattern
          id="hatch-b"
          patternUnits="userSpaceOnUse"
          width="10"
          height="10"
          patternTransform="rotate(-45)"
        >
          <line x1="0" y1="0" x2="0" y2="10" stroke="#2d2d2d" strokeWidth="1.6" />
        </pattern>
      </defs>

      {/* Far-left tall leaning tower (behind), diagonal hatch */}
      <path
        d="M0 1060 L40 621 L152 615 L152 1060"
        fill="url(#hatch-a)"
        stroke="#3a3a3a"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Short front building at the leaning tower's base */}
      <path d="M10 1060 L10 812 L170 812 L170 1060" fill="#111111" stroke="none" />
      <path
        d="M10 1060 L10 812 L170 812 L170 1060"
        fill="#ffffff"
        fillOpacity="0.04"
        stroke="#404040"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M10 1060 L10 812 L170 812 L170 1060" fill="url(#hatch-a)" stroke="none" />

      {/* Mid tower with dashed window columns */}
      <path
        d="M221 1060 L221 601 L330 601 L330 1060"
        fill="#ffffff"
        fillOpacity="0.02"
        stroke="#3a3a3a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {[248, 276, 304].map((x) => (
        <line
          key={x}
          x1={x}
          y1={624}
          x2={x}
          y2={1050}
          stroke="#404040"
          strokeWidth="2"
          strokeDasharray="10 8"
        />
      ))}

      {/* Short front building overlapping the mid tower's right corner */}
      <path d="M314 1060 L314 881 L414 881 L414 1060" fill="#111111" stroke="none" />
      <path
        d="M314 1060 L314 881 L414 881 L414 1060"
        fill="#ffffff"
        fillOpacity="0.05"
        stroke="#454545"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M314 1060 L314 881 L414 881 L414 1060" fill="url(#hatch-b)" stroke="none" />

      {/* Hero tower — gold, tallest, dashed window columns */}
      <path
        d="M474 1060 L474 445 L626 445 L626 1060"
        fill="#c9a96e"
        fillOpacity="0.09"
        stroke="#c9a96e"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {[500, 534, 568, 602].map((x) => (
        <line
          key={x}
          x1={x}
          y1={470}
          x2={x}
          y2={1050}
          stroke="#c9a96e"
          strokeWidth="2"
          strokeDasharray="11 9"
          opacity="0.65"
        />
      ))}

      {/* Tall right tower, nearly touching the hero */}
      <path
        d="M628 1060 L628 582 L725 582 L725 1060"
        fill="url(#hatch-b)"
        stroke="#3f3f3f"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Edge building, cropped by the right edge */}
      <path
        d="M725 1060 L725 678 L760 678"
        fill="url(#hatch-a)"
        stroke="#333333"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Trees left — round canopies in front of the left group */}
      <g fill="#111111" stroke="#4a4a4a" strokeWidth="2.5" strokeLinecap="round">
        <line x1="155" y1="1060" x2="155" y2="1004" />
        <line x1="155" y1="1014" x2="143" y2="994" />
        <line x1="155" y1="1002" x2="167" y2="984" />
        <circle cx="155" cy="967" r="39" />
        <line x1="206" y1="1060" x2="206" y2="1034" />
        <circle cx="206" cy="1006" r="31" />
      </g>

      {/* Trees right — larger, in front of the right towers */}
      <g fill="#111111" stroke="#4a4a4a" strokeWidth="2.5" strokeLinecap="round">
        <line x1="639" y1="1060" x2="639" y2="1001" />
        <line x1="639" y1="1011" x2="625" y2="989" />
        <circle cx="639" cy="957" r="46" />
        <line x1="726" y1="1060" x2="726" y2="1036" />
        <circle cx="726" cy="995" r="43" />
      </g>
    </svg>
  )
}

export default function LoginPage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
      />
      <style>{`
        #login-page {
          --font-body: 'Inter', sans-serif;
        }
      `}</style>

      <div id="login-page" className="flex min-h-screen w-full bg-black">
        {/* ── Left column — login form ── */}
        <div className="relative flex flex-1 flex-col overflow-y-auto bg-[#0a0a0a]">
          {/* Logo — fixed top-left, decoupled from the centered form */}
          <div className="absolute left-8 top-8 flex items-center gap-3 lg:left-10 lg:top-10">
            <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <LogoMark className="h-6 w-auto" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-[0.06em] uppercase text-white leading-none">
                NEW SZN<sup className="text-[7px] font-bold ml-px">®</sup>
              </p>
              <p className="text-[8px] tracking-[0.16em] uppercase text-gray-600">
                Agency Performance
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-8 py-24 sm:px-12">
            <MotionFade>
              <div className="mx-auto w-full max-w-md space-y-8">
                <div className="text-center">
                  <h1 className="text-3xl font-bold tracking-tight text-white">Sign In</h1>
                  <p className="mt-1 text-sm text-white/40">
                    Enter your credentials to access your dashboard.
                  </p>
                </div>

                <LoginForm />

                <p className="text-center text-xs text-white/30">Access is by invitation only.</p>
              </div>
            </MotionFade>
          </div>
        </div>

        {/* ── Right column — slogan + illustration ── */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#111111]">
          <BuildingIllustration />
          <div className="relative z-10 px-16 pt-24">
            <p className="text-3xl font-semibold tracking-tight text-white/90">
              Know exactly where you stand.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
