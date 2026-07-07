import type { Metadata } from 'next'
import { SetPasswordForm } from './set-password-form'

export const metadata: Metadata = { title: 'Set password — NEW SZN' }

export default function SetPasswordPage({
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
          This invite link is missing or invalid. Contact your admin.
        </p>
      </>
    )
  }

  return (
    <>
      <h1 className="text-white text-xl font-semibold mb-1.5">Set your password</h1>
      <p className="text-white/40 text-sm mb-7">
        Choose a password to activate your account.
      </p>
      <SetPasswordForm token={token} />
    </>
  )
}
