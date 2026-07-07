import type { Metadata } from 'next'
import { SailIcon } from '@/components/icons'
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
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@400;500&display=swap"
      />
      <style>{`
        #login-page {
          --font-display: 'Instrument Serif', serif;
          --font-body: 'Inter', sans-serif;
        }
        #login-page .liquid-glass {
          background: rgba(255, 255, 255, 0.01);
          background-blend-mode: luminosity;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          border: none;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
          position: relative;
          overflow: hidden;
        }
        #login-page .liquid-glass::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1.4px;
          background: linear-gradient(180deg,
            rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
            rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
            rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        @keyframes fade-rise {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        #login-page .animate-fade-rise { animation: fade-rise 0.8s ease-out both; }
        #login-page .animate-fade-rise-delay { animation: fade-rise 0.8s ease-out 0.2s both; }
        #login-page .animate-fade-rise-delay-2 { animation: fade-rise 0.8s ease-out 0.4s both; }
      `}</style>

      <div id="login-page" className="flex min-h-screen w-full bg-black">
        {/* ── Left column — cinematic hero, animation only ── */}
        <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden rounded-3xl">
          <video autoPlay muted loop playsInline className="absolute inset-0 z-0 h-full w-full object-cover">
            <source src={VIDEO_SRC} type="video/mp4" />
          </video>

          <div className="relative z-10 flex h-full w-full flex-col justify-between p-10">
            <div>
              <div className="flex items-center gap-2">
                <SailIcon size={20} />
                <span
                  className="text-xl font-semibold tracking-tight text-white"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  NEW SZN
                </span>
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-white/50">
                Agency Performance
              </p>
            </div>

            <div className="space-y-6">
              <h2
                className="animate-fade-rise text-5xl font-normal leading-[0.95] tracking-[-2px] text-white"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Where performance <em className="not-italic text-white/50">meets precision.</em>
              </h2>
              <p className="animate-fade-rise-delay max-w-xs text-sm leading-relaxed text-white/60">
                Track your team. Close more deals. Grow faster.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right column — login form ── */}
        <div
          className="flex flex-1 flex-col justify-center overflow-y-auto px-8 py-12 sm:px-12 lg:px-16 xl:px-20"
          style={{ backgroundColor: 'hsl(201, 100%, 13%)' }}
        >
          <MotionFade>
            <div className="mx-auto w-full max-w-md space-y-8">
              {/* Mobile logo */}
              <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
                <SailIcon size={18} />
                <span
                  className="text-base font-semibold tracking-tight text-white"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  NEW SZN
                </span>
              </div>

              <div>
                <h1
                  className="text-3xl font-normal tracking-tight text-white"
                  style={{ fontFamily: 'var(--font-display)' }}
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
