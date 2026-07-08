'use client'
import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { loginAction } from './actions'

const INPUT =
  'w-full bg-white/5 border border-white/10 rounded-xl h-11 px-4 text-white text-sm placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e]/80 transition-all duration-150'

const LABEL = 'block text-sm font-medium text-white/60 tracking-wide'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-[#c9a96e] hover:bg-[#d4b57d] active:bg-[#b8975c] disabled:opacity-50 text-black text-sm font-semibold py-3 rounded-lg transition-colors duration-150"
    >
      {pending ? 'Signing in…' : 'Sign In'}
    </button>
  )
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, null)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className={`${LABEL} mb-1.5`}>
          Email
        </label>
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

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className={LABEL}>
            Password
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs text-white/60 hover:text-white/80 transition-colors duration-150"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
          className={INPUT}
        />
      </div>

      {state?.error && (
        <p className="text-red-400/80 text-xs pt-0.5">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  )
}
