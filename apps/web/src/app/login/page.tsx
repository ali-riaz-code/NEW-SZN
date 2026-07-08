import type { Metadata } from 'next'
import { LogoMark } from '@/components/icons'
import { LoginForm } from './login-form'
import { MotionFade } from './motion-fade'

export const metadata: Metadata = { title: 'Sign in — NEW SZN' }

type Building = {
  x: number
  width: number
  top: number
  fill: string
  windowFill: string
  windowOpacity: number
}

const GROUND_Y = 600

const BUILDINGS: Building[] = [
  { x: 8, width: 66, top: 350, fill: '#191919', windowFill: '#ffffff', windowOpacity: 0.05 },
  { x: 82, width: 70, top: 265, fill: '#232323', windowFill: '#ffffff', windowOpacity: 0.06 },
  { x: 160, width: 90, top: 120, fill: '#c9a96e', windowFill: '#0a0a0a', windowOpacity: 0.55 },
  { x: 258, width: 62, top: 300, fill: '#1c1c1c', windowFill: '#ffffff', windowOpacity: 0.05 },
  { x: 328, width: 80, top: 195, fill: '#282828', windowFill: '#ffffff', windowOpacity: 0.06 },
  { x: 416, width: 68, top: 375, fill: '#1c1c1c', windowFill: '#ffffff', windowOpacity: 0.05 },
]

function buildingWindows(b: Building) {
  const marginX = 11
  const cols = Math.max(1, Math.floor((b.width - marginX * 2) / 15))
  const marginTop = 22
  const marginBottom = 26
  const rows = Math.max(1, Math.floor((GROUND_Y - b.top - marginTop - marginBottom) / 21))
  const items: React.ReactNode[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = b.x + marginX + c * 15
      const wy = b.top + marginTop + r * 21
      items.push(
        <rect
          key={`${b.x}-${r}-${c}`}
          x={wx}
          y={wy}
          width={5}
          height={11}
          fill={b.windowFill}
          opacity={b.windowOpacity}
        />,
      )
    }
  }
  return items
}

function QuoteMark() {
  return (
    <svg width="34" height="26" viewBox="0 0 34 26" fill="none" aria-hidden="true">
      <path
        d="M4 26V15.2C4 8.8 7.4 3.7 14.2 0L16.8 3.4C12.1 6.4 10 9.4 10 13.2H15.2V26H4Z"
        fill="#c9a96e"
        opacity="0.55"
      />
      <path
        d="M19 26V15.2C19 8.8 22.4 3.7 29.2 0L31.8 3.4C27.1 6.4 25 9.4 25 13.2H30.2V26H19Z"
        fill="#c9a96e"
        opacity="0.55"
      />
    </svg>
  )
}

function BuildingIllustration() {
  return (
    <svg
      viewBox="0 0 500 600"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {BUILDINGS.map((b) => {
        const height = GROUND_Y - b.top
        return (
          <g key={b.x}>
            <rect x={b.x} y={b.top} width={b.width} height={height} fill={b.fill} />
            <rect x={b.x} y={b.top} width={b.width} height={3} fill="#ffffff" opacity={0.08} />
            {buildingWindows(b)}
          </g>
        )
      })}

      {/* Ground-level trees */}
      <g>
        <line x1="60" y1="580" x2="60" y2="600" stroke="#333333" strokeWidth="2" />
        <circle cx="60" cy="572" r="10" fill="#c9a96e" fillOpacity="0.18" stroke="#c9a96e" strokeWidth="1.25" strokeOpacity="0.4" />
        <line x1="392" y1="586" x2="392" y2="600" stroke="#333333" strokeWidth="2" />
        <circle cx="392" cy="578" r="8" fill="#c9a96e" fillOpacity="0.18" stroke="#c9a96e" strokeWidth="1.25" strokeOpacity="0.4" />
        <line x1="480" y1="583" x2="480" y2="600" stroke="#333333" strokeWidth="2" />
        <circle cx="480" cy="575" r="9" fill="#c9a96e" fillOpacity="0.18" stroke="#c9a96e" strokeWidth="1.25" strokeOpacity="0.4" />
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
          <div className="relative z-10 flex flex-col px-16 pt-24 max-w-lg">
            <QuoteMark />
            <p className="mt-6 text-2xl font-semibold leading-snug text-white/90">
              The moment you sign in, you know exactly where you stand.{' '}
              <span className="font-normal text-white/50">No hunting. No ambiguity — just the score.</span>
            </p>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-[#c9a96e]">
              — The Scoreboard
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
