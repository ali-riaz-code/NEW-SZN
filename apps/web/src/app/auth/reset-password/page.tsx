import type { Metadata } from 'next'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = { title: 'Reset password — NEW SZN' }

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  const { token } = searchParams

  if (!token) {
    return (
      <>
        <h1 className="text-white text-lg font-semibold mb-2">Invalid link</h1>
        <p className="text-white/40 text-sm">
          This reset link is missing or invalid. Request a new one.
        </p>
      </>
    )
  }

  return (
    <>
      <h1 className="text-white text-xl font-semibold mb-1.5">Create new password</h1>
      <p className="text-white/40 text-sm mb-7">Enter a new password for your account.</p>
      <ResetPasswordForm token={token} />
    </>
  )
}
