import type { Metadata } from 'next'
import { LogoMark } from '@/components/icons'
import { LoginForm } from './login-form'
import { MotionFade } from './motion-fade'

export const metadata: Metadata = { title: 'Sign in — NEW SZN' }

/*
 * Line-art skyline in the reference illustration's language: stroked outlines,
 * diagonal hatching, dashed window columns, stepped rooflines, slight
 * perspective side faces, and outlined round trees in front. Bottom-anchored
 * so the buildings bleed off the panel edge.
 */
function BuildingIllustration() {
  return (
    <svg
      viewBox="0 0 800 950"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="hatch-a"
          patternUnits="userSpaceOnUse"
          width="11"
          height="11"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="11" stroke="#2c2c2c" strokeWidth="1.5" />
        </pattern>
        <pattern
          id="hatch-b"
          patternUnits="userSpaceOnUse"
          width="14"
          height="14"
          patternTransform="rotate(-45)"
        >
          <line x1="0" y1="0" x2="0" y2="14" stroke="#262626" strokeWidth="1.5" />
        </pattern>
      </defs>

      {/* Far left — leaning tower, diagonal hatch */}
      <path
        d="M40 950 L64 470 L158 478 L158 950"
        fill="url(#hatch-a)"
        stroke="#333333"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Hero tower — gold outline, stepped parapet, dashed window columns */}
      <g>
        <path
          d="M180 950 L180 250 L200 250 L200 228 L280 228 L280 250 L300 250 L300 950"
          fill="#c9a96e"
          fillOpacity="0.05"
          stroke="#c9a96e"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {[204, 228, 252, 276].map((x) => (
          <line
            key={x}
            x1={x}
            y1={272}
            x2={x}
            y2={940}
            stroke="#c9a96e"
            strokeWidth="2"
            strokeDasharray="12 9"
            opacity="0.7"
          />
        ))}
      </g>

      {/* Mid tower with perspective side face */}
      <g>
        <path
          d="M320 950 L320 430 L410 430 L410 950"
          fill="#ffffff"
          fillOpacity="0.02"
          stroke="#3a3a3a"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M410 950 L410 430 L434 442 L434 950"
          fill="url(#hatch-b)"
          stroke="#3a3a3a"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {[338, 362, 386].map((x) => (
          <line
            key={x}
            x1={x}
            y1={452}
            x2={x}
            y2={940}
            stroke="#3f3f3f"
            strokeWidth="2"
            strokeDasharray="9 8"
          />
        ))}
      </g>

      {/* Short front building — stepped parapet, diagonal hatch */}
      <path
        d="M430 950 L430 620 L446 620 L446 606 L524 606 L524 620 L540 620 L540 950"
        fill="url(#hatch-a)"
        stroke="#383838"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Tall right tower with side face */}
      <g>
        <path
          d="M560 950 L560 310 L690 310 L690 950"
          fill="url(#hatch-a)"
          stroke="#3f3f3f"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M690 950 L690 310 L716 324 L716 950"
          fill="url(#hatch-b)"
          stroke="#3f3f3f"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>

      {/* Edge building, cropped by right edge */}
      <path
        d="M730 950 L730 520 L800 520"
        fill="url(#hatch-b)"
        stroke="#2e2e2e"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Trees — outlined canopies with trunks, drawn in front of the buildings */}
      <g fill="none" stroke="#3f3f3f" strokeWidth="2" strokeLinecap="round">
        <line x1="350" y1="950" x2="350" y2="905" />
        <line x1="350" y1="905" x2="340" y2="888" />
        <line x1="350" y1="898" x2="360" y2="882" />
        <circle cx="350" cy="878" r="30" />
        <line x1="555" y1="950" x2="555" y2="922" />
        <circle cx="555" cy="899" r="22" />
        <line x1="745" y1="950" x2="745" y2="916" />
        <line x1="745" y1="916" x2="734" y2="898" />
        <circle cx="745" cy="882" r="34" />
      </g>
      <g fill="none" stroke="#c9a96e" strokeWidth="2" strokeLinecap="round" opacity="0.5">
        <line x1="160" y1="950" x2="160" y2="923" />
        <circle cx="160" cy="905" r="18" />
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
