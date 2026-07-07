import { Router } from 'express'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { prisma } from '@new-szn/db'
import { requireRole } from '../middleware/auth'
import { sendInviteEmail } from '../integrations/email'
import { id } from '../lib/validation'

const router = Router()

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  role: z.enum(['ADMIN', 'CLOSER', 'SETTER', 'CLIENT']),
  clientIds: z.array(id).default([]),
})

// POST /api/admin/users/invite — admin creates and invites a new user
router.post('/users/invite', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const parsed = inviteSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() })
    }

    const { email, name, role, clientIds } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) {
      return res.status(409).json({ error: 'A user with that email already exists.' })
    }

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { email, name, role, passwordHash: '', isActive: false },
      })

      if (clientIds.length > 0) {
        await tx.membership.createMany({
          data: clientIds.map((clientId) => ({ userId: newUser.id, clientId })),
          skipDuplicates: true,
        })
      }

      await tx.inviteToken.create({
        data: { userId: newUser.id, token, expiresAt },
      })

      return newUser
    })

    const inviteUrl = `${process.env.APP_URL ?? 'http://localhost:3000'}/auth/set-password?token=${token}`
    await sendInviteEmail(email, inviteUrl)

    return res.status(201).json({ userId: user.id })
  } catch (error) {
    next(error)
  }
})

export default router
