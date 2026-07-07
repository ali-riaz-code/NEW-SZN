'use server'

export async function forgotPasswordAction(
  _prev: { sent?: boolean; error?: string } | null,
  formData: FormData
): Promise<{ sent?: boolean; error?: string } | null> {
  const email = (formData.get('email') as string | null)?.trim()
  if (!email) return { error: 'Email is required.' }

  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/auth/forgot-password`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }
    )
  } catch {
    // Silently swallow — we never reveal whether the email exists
  }

  return { sent: true }
}
