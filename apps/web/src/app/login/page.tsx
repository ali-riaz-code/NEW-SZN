import type { Metadata } from 'next'
import { LogoMark } from '@/components/icons'
import { LoginForm } from './login-form'
import { MotionFade } from './motion-fade'

export const metadata: Metadata = { title: 'Sign in — NEW SZN' }

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4'

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
        {/* ── Left column — cinematic hero, animation only ── */}
        <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden rounded-3xl">
          <video autoPlay muted loop playsInline className="absolute inset-0 z-0 h-full w-full object-cover">
            <source src={VIDEO_SRC} type="video/mp4" />
          </video>

          <div className="relative z-10 flex h-full w-full flex-col justify-between p-10">
            <div>
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.06] shadow-[0_0_20px_rgba(0,0,0,0.4)]">
                  <LogoMark className="h-6 w-auto drop-shadow-[0_0_8px_rgba(233,30,99,0.25)]" />
                </div>
                <div>
                  <p className="text-[13px] font-bold tracking-[0.06em] uppercase text-white leading-none">
                    NEW SZN<sup className="text-[8px] font-bold ml-px">®</sup>
                  </p>
                  <p className="mt-0.5 text-[9px] tracking-[0.16em] uppercase text-gray-600">
                    Agency Performance
                  </p>
                </div>
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-white/50">
                Agency Performance
              </p>
            </div>

            <div className="space-y-6">
              <h2
                className="text-4xl font-bold leading-[1.1] text-white"
              >
                Where performance <span className="text-white/60">meets precision.</span>
              </h2>
              <p className="max-w-xs text-sm leading-relaxed text-white/60">
                Track your team. Close more deals. Grow faster.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right column — login form ── */}
        <div
          className="flex flex-1 flex-col justify-center overflow-y-auto px-8 py-12 sm:px-12 lg:px-16 xl:px-20 bg-[#0a0a0a]"
        >
          <MotionFade>
            <div className="mx-auto w-full max-w-md space-y-8">
              {/* Mobile logo */}
              <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
                <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <LogoMark className="h-5 w-auto" />
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
                <h1
                  className="text-3xl font-bold tracking-tight text-white"
                >
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
      </div>
    </div>
  )
}
