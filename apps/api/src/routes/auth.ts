import { Router } from 'express'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { prisma } from '@new-szn/db'
import { sendPasswordResetEmail } from '../integrations/email'

const router = Router()

const forgotSchema = z.object({
  email: z.string().email(),
})

// POST /api/auth/forgot-password — public; always returns 200 to prevent email enumeration
router.post('/forgot-password', async (req, res, next) => {
  try {
    const parsed = forgotSchema.safeParse(req.body)
    const ok = { message: 'If that email is registered, a reset link has been sent.' }

    if (!parsed.success) return res.status(200).json(ok)

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    })

    if (user) {
      const token = randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await prisma.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt },
      })

      const resetUrl = `${process.env.APP_URL ?? 'http://localhost:3000'}/auth/reset-password?token=${token}`
      await sendPasswordResetEmail(parsed.data.email, resetUrl)
    }

    return res.status(200).json(ok)
  } catch (error) {
    next(error)
  }
})

export default router
