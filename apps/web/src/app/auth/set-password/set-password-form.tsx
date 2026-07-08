'use client'
import { useFormState, useFormStatus } from 'react-dom'
import { setPasswordAction } from './actions'

const INPUT =
  'w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/50 focus:outline-none focus:border-[#c9a96e]/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-[#c9a96e]/20 transition-all duration-150'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-[#c9a96e] hover:bg-[#d4b57d] active:bg-[#b8975c] disabled:opacity-50 text-[#0a0a0a] text-sm font-semibold py-3 rounded-lg transition-colors duration-150 cursor-pointer"
    >
      {pending ? 'Setting password…' : 'Activate account'}
    </button>
  )
}

export function SetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useFormState(setPasswordAction, null)

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <input
        name="password"
        type="password"
        placeholder="New password (min. 8 characters)"
        minLength={8}
        required
        className={INPUT}
      />
      <input
        name="confirmPassword"
        type="password"
        placeholder="Confirm password"
        required
        className={INPUT}
      />
      {state?.error && <p className="text-red-400/80 text-xs">{state.error}</p>}
      <SubmitButton />
    </form>
  )
}
