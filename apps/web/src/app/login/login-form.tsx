'use client'
import { useEffect, useRef } from 'react'
import type { AnimationEvent } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { loginAction } from './actions'

/* Pill radius + leading field icons are a login-page-only reference
 * treatment — global inputs/buttons keep the 8px system radius.
 * Motion classes (szn-item, szn-btn, szn-shake, szn-error-in) are defined
 * in the page-level style block, all reduced-motion aware. */

const LABEL = 'block text-sm font-medium text-white/70 tracking-wide'

const ICON_WRAP =
  'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/50 transition-colors duration-150 group-focus-within:text-[#c9a96e]/90'

function inputClass(invalid: boolean) {
  return [
    'w-full bg-white/5 border rounded-full h-11 pl-11 pr-4 text-white text-sm',
    'placeholder:text-white/60 transition-all duration-150 focus:outline-none',
    'focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e]/80',
    'focus:shadow-[0_0_24px_rgba(201,169,110,0.12)]',
    invalid ? 'border-red-400/50' : 'border-white/10',
  ].join(' ')
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="3" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 4.5 8 9l6-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.5" y="7" width="11" height="7" rx="1.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

/* Invisible marker that flips on while the server action is pending; the
 * page and skyline trigger the sign-in cinematic (gold sweep + windows
 * lighting up) via #login-card:has([data-auth-pending]) selectors. */
function PendingMarker() {
  const { pending } = useFormStatus()
  return <span hidden data-auth-pending={pending || undefined} />
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      data-pending={pending || undefined}
      className="szn-btn relative h-11 w-full overflow-hidden rounded-full bg-[#c9a96e] text-sm font-semibold text-black transition-[background-color,box-shadow,transform] duration-150 hover:bg-[#d4b57d] hover:shadow-[0_0_24px_rgba(201,169,110,0.28)] active:scale-[0.98] active:bg-[#b8975c] disabled:opacity-60"
    >
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  )
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!state?.error) return
    const el = formRef.current
    if (!el) return
    el.classList.remove('szn-shake')
    // force reflow so a repeated error restarts the shake
    void el.getBoundingClientRect()
    el.classList.add('szn-shake')
  }, [state])

  const settle = (e: AnimationEvent<HTMLFormElement>) => {
    if (e.target === e.currentTarget && e.animationName === 'szn-shake') {
      e.currentTarget.classList.remove('szn-shake')
    }
  }

  const invalid = Boolean(state?.error)

  return (
    <form ref={formRef} action={formAction} onAnimationEnd={settle} className="space-y-5">
      <div className="szn-item" style={{ ['--i' as string]: 1 }}>
        <label htmlFor="email" className={`${LABEL} mb-1`}>
          Email <span aria-hidden="true" className="text-white/55">*</span>
        </label>
        <div className="group relative">
          <span className={ICON_WRAP}>
            <MailIcon />
          </span>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
            className={inputClass(invalid)}
          />
        </div>
      </div>

      <div className="szn-item" style={{ ['--i' as string]: 2 }}>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="password" className={LABEL}>
            Password <span aria-hidden="true" className="text-white/55">*</span>
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs font-medium text-white/60 transition-colors duration-150 hover:text-white/80"
          >
            Forgot password?
          </Link>
        </div>
        <div className="group relative">
          <span className={ICON_WRAP}>
            <LockIcon />
          </span>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Enter password"
            required
            autoComplete="current-password"
            className={inputClass(invalid)}
          />
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="szn-error-in pt-0.5 text-xs text-red-400/90">
          {state.error}
        </p>
      )}

      <div className="szn-item pt-3" style={{ ['--i' as string]: 3 }}>
        <PendingMarker />
        <SubmitButton />
      </div>
    </form>
  )
}
