'use server'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from '@new-szn/db'

export async function setPasswordAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const token = formData.get('token') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!token) return { error: 'Invalid request.' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }
  if (password !== confirmPassword) return { error: 'Passwords do not match.' }

  const inviteToken = await prisma.inviteToken.findUnique({
    where: { token },
    select: { userId: true, usedAt: true, expiresAt: true },
  })

  if (!inviteToken) return { error: 'This invite link is invalid.' }
  if (inviteToken.usedAt) return { error: 'This invite link has already been used.' }
  if (inviteToken.expiresAt < new Date()) return { error: 'This invite link has expired. Ask an admin to resend it.' }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: inviteToken.userId },
      data: { passwordHash, isActive: true },
    }),
    prisma.inviteToken.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ])

  redirect('/login')
}
