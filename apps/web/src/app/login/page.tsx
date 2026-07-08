import type { Metadata } from 'next'
import { LogoMark } from '@/components/icons'
import { LoginForm } from './login-form'
import { MotionFade } from './motion-fade'

export const metadata: Metadata = { title: 'Sign in — NEW SZN' }

function BuildingIllustration() {
  return (
    <svg
      viewBox="0 0 500 600"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="buildingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#1a1a1a', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#0a0a0a', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="500" height="600" fill="url(#buildingGradient)" />

      {/* Far left building — tall, minimal lines */}
      <g>
        <path d="M 60 250 L 60 550 L 140 550 L 140 250" stroke="#2a2a2a" strokeWidth="2" fill="none" />
        <line x1="80" y1="280" x2="80" y2="330" stroke="#2a2a2a" strokeWidth="1.5" opacity="0.7" />
        <line x1="100" y1="280" x2="100" y2="330" stroke="#2a2a2a" strokeWidth="1.5" opacity="0.7" />
        <line x1="120" y1="280" x2="120" y2="330" stroke="#2a2a2a" strokeWidth="1.5" opacity="0.7" />
        <line x1="80" y1="360" x2="80" y2="410" stroke="#2a2a2a" strokeWidth="1.5" opacity="0.7" />
        <line x1="100" y1="360" x2="100" y2="410" stroke="#2a2a2a" strokeWidth="1.5" opacity="0.7" />
        <line x1="120" y1="360" x2="120" y2="410" stroke="#2a2a2a" strokeWidth="1.5" opacity="0.7" />
        <line x1="80" y1="440" x2="80" y2="490" stroke="#2a2a2a" strokeWidth="1.5" opacity="0.7" />
        <line x1="100" y1="440" x2="100" y2="490" stroke="#2a2a2a" strokeWidth="1.5" opacity="0.7" />
        <line x1="120" y1="440" x2="120" y2="490" stroke="#2a2a2a" strokeWidth="1.5" opacity="0.7" />
      </g>

      {/* Center-left mid-height building */}
      <g>
        <path d="M 150 320 L 150 550 L 250 550 L 250 320" stroke="#333333" strokeWidth="2.5" fill="none" />
        <line x1="170" y1="350" x2="170" y2="400" stroke="#333333" strokeWidth="1.5" opacity="0.6" />
        <line x1="190" y1="350" x2="190" y2="400" stroke="#333333" strokeWidth="1.5" opacity="0.6" />
        <line x1="210" y1="350" x2="210" y2="400" stroke="#333333" strokeWidth="1.5" opacity="0.6" />
        <line x1="230" y1="350" x2="230" y2="400" stroke="#333333" strokeWidth="1.5" opacity="0.6" />
        <line x1="170" y1="430" x2="170" y2="480" stroke="#333333" strokeWidth="1.5" opacity="0.6" />
        <line x1="190" y1="430" x2="190" y2="480" stroke="#333333" strokeWidth="1.5" opacity="0.6" />
        <line x1="210" y1="430" x2="210" y2="480" stroke="#333333" strokeWidth="1.5" opacity="0.6" />
        <line x1="230" y1="430" x2="230" y2="480" stroke="#333333" strokeWidth="1.5" opacity="0.6" />
      </g>

      {/* Center tall building — highlighted with gold accent */}
      <g>
        <path d="M 260 150 L 260 550 L 360 550 L 360 150" stroke="#c9a96e" strokeWidth="2.5" fill="none" />
        <line x1="280" y1="180" x2="280" y2="240" stroke="#c9a96e" strokeWidth="1.5" opacity="0.8" />
        <line x1="300" y1="180" x2="300" y2="240" stroke="#c9a96e" strokeWidth="1.5" opacity="0.8" />
        <line x1="320" y1="180" x2="320" y2="240" stroke="#c9a96e" strokeWidth="1.5" opacity="0.8" />
        <line x1="340" y1="180" x2="340" y2="240" stroke="#c9a96e" strokeWidth="1.5" opacity="0.8" />
        <line x1="280" y1="270" x2="280" y2="330" stroke="#c9a96e" strokeWidth="1.5" opacity="0.8" />
        <line x1="300" y1="270" x2="300" y2="330" stroke="#c9a96e" strokeWidth="1.5" opacity="0.8" />
        <line x1="320" y1="270" x2="320" y2="330" stroke="#c9a96e" strokeWidth="1.5" opacity="0.8" />
        <line x1="340" y1="270" x2="340" y2="330" stroke="#c9a96e" strokeWidth="1.5" opacity="0.8" />
        <line x1="280" y1="360" x2="280" y2="420" stroke="#c9a96e" strokeWidth="1.5" opacity="0.8" />
        <line x1="300" y1="360" x2="300" y2="420" stroke="#c9a96e" strokeWidth="1.5" opacity="0.8" />
        <line x1="320" y1="360" x2="320" y2="420" stroke="#c9a96e" strokeWidth="1.5" opacity="0.8" />
        <line x1="340" y1="360" x2="340" y2="420" stroke="#c9a96e" strokeWidth="1.5" opacity="0.8" />
        <line x1="280" y1="450" x2="280" y2="510" stroke="#c9a96e" strokeWidth="1.5" opacity="0.8" />
        <line x1="300" y1="450" x2="300" y2="510" stroke="#c9a96e" strokeWidth="1.5" opacity="0.8" />
        <line x1="320" y1="450" x2="320" y2="510" stroke="#c9a96e" strokeWidth="1.5" opacity="0.8" />
        <line x1="340" y1="450" x2="340" y2="510" stroke="#c9a96e" strokeWidth="1.5" opacity="0.8" />
      </g>

      {/* Center-right shorter building */}
      <g>
        <path d="M 370 280 L 370 550 L 450 550 L 450 280" stroke="#2a2a2a" strokeWidth="2" fill="none" />
        <line x1="385" y1="310" x2="385" y2="360" stroke="#2a2a2a" strokeWidth="1.5" opacity="0.7" />
        <line x1="405" y1="310" x2="405" y2="360" stroke="#2a2a2a" strokeWidth="1.5" opacity="0.7" />
        <line x1="425" y1="310" x2="425" y2="360" stroke="#2a2a2a" strokeWidth="1.5" opacity="0.7" />
        <line x1="385" y1="390" x2="385" y2="440" stroke="#2a2a2a" strokeWidth="1.5" opacity="0.7" />
        <line x1="405" y1="390" x2="405" y2="440" stroke="#2a2a2a" strokeWidth="1.5" opacity="0.7" />
        <line x1="425" y1="390" x2="425" y2="440" stroke="#2a2a2a" strokeWidth="1.5" opacity="0.7" />
      </g>

      {/* Decorative trees/vegetation at base */}
      <g opacity="0.4">
        <circle cx="80" cy="540" r="8" stroke="#c9a96e" strokeWidth="1.5" fill="none" />
        <circle cx="100" cy="545" r="6" stroke="#c9a96e" strokeWidth="1.5" fill="none" />
        <circle cx="420" cy="540" r="7" stroke="#c9a96e" strokeWidth="1.5" fill="none" />
        <circle cx="440" cy="545" r="5" stroke="#c9a96e" strokeWidth="1.5" fill="none" />
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
        <div className="flex flex-1 flex-col justify-center overflow-y-auto px-8 py-12 sm:px-12 lg:px-16 xl:px-20 bg-[#0a0a0a]">
          <MotionFade>
            <div className="mx-auto w-full max-w-md space-y-8">
              {/* Logo and app name */}
              <div className="flex items-center gap-3">
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

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Sign In
                </h1>
                <p className="mt-1 text-sm text-white/40">
                  Enter your credentials to access your dashboard.
                </p>
              </div>

              <LoginForm />

              <p className="text-center text-xs text-white/30">Access is by invitation only.</p>
            </div>
          </MotionFade>
        </div>

        {/* ── Right column — illustration ── */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
          <BuildingIllustration />
        </div>
      </div>
    </div>
  )
}
