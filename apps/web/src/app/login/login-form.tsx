'use client'
import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { loginAction } from './actions'

/* Pill radius + leading field icons are a login-page-only reference
 * treatment — global inputs/buttons keep the 8px system radius. */

const INPUT =
  'w-full bg-white/5 border border-white/10 rounded-full h-11 pl-11 pr-4 text-white text-sm placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e]/80 transition-all duration-150'

const LABEL = 'block text-sm font-medium text-white/60 tracking-wide'

const ICON_WRAP =
  'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40'

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

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 w-full rounded-full bg-[#c9a96e] text-sm font-semibold text-black transition-colors duration-150 hover:bg-[#d4b57d] active:bg-[#b8975c] disabled:opacity-50"
    >
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  )
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, null)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className={`${LABEL} mb-1.5`}>
          Email <span aria-hidden="true" className="text-white/30">*</span>
        </label>
        <div className="relative">
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
            className={INPUT}
          />
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className={LABEL}>
            Password <span aria-hidden="true" className="text-white/30">*</span>
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs text-white/60 transition-colors duration-150 hover:text-white/80"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
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
            className={INPUT}
          />
        </div>
      </div>

      {state?.error && (
        <p className="pt-0.5 text-xs text-red-400/80">{state.error}</p>
      )}

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  )
}
