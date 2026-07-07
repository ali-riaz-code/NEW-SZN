'use client'
import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { forgotPasswordAction } from './actions'

const INPUT =
  'w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#c9a96e]/50 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.08)] transition-all duration-150'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-[#c9a96e] hover:bg-[#d4b57d] active:bg-[#b8975c] disabled:opacity-50 text-[#0a0a0a] text-sm font-semibold py-3 rounded-lg transition-all duration-150 ease-out hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(201,169,110,0.35)] active:translate-y-0 active:shadow-none cursor-pointer"
    >
      {pending ? 'Sending…' : 'Send reset link'}
    </button>
  )
}

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(forgotPasswordAction, null)

  if (state?.sent) {
    return (
      <div className="text-center py-2">
        <p className="text-white/70 text-sm mb-6">
          If that email is registered, a reset link has been sent. Check your inbox.
        </p>
        <Link href="/login" className="text-[#c9a96e]/60 hover:text-[#c9a96e] text-sm transition-colors duration-150">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-3">
      <input
        name="email"
        type="email"
        placeholder="Email"
        required
        autoComplete="email"
        className={INPUT}
      />
      {state?.error && <p className="text-red-400/80 text-xs">{state.error}</p>}
      <SubmitButton />
      <div className="text-center pt-1">
        <Link href="/login" className="text-white/30 hover:text-white/50 text-xs transition-colors">
          Back to sign in
        </Link>
      </div>
    </form>
  )
}
