import type { Metadata } from 'next'
import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = { title: 'Forgot password — NEW SZN' }

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-white text-xl font-semibold mb-1.5">Forgot your password?</h1>
      <p className="text-white/40 text-sm mb-7">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <ForgotPasswordForm />
    </>
  )
}
