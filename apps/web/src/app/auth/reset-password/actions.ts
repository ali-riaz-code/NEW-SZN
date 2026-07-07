'use server'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from '@new-szn/db'

export async function resetPasswordAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const token = formData.get('token') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!token) return { error: 'Invalid request.' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }
  if (password !== confirmPassword) return { error: 'Passwords do not match.' }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    select: { userId: true, usedAt: true, expiresAt: true },
  })

  if (!resetToken) return { error: 'This reset link is invalid.' }
  if (resetToken.usedAt) return { error: 'This reset link has already been used.' }
  if (resetToken.expiresAt < new Date()) return { error: 'This reset link has expired. Request a new one.' }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ])

  redirect('/login')
}
