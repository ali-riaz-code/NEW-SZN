import type { Request, Response, NextFunction } from 'express'
import type { Role } from '@new-szn/types'

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; role: Role }
    }
  }
}

// Server-to-server auth: Next.js Server Actions include X-Internal-Secret +
// X-User-Id + X-User-Role headers after verifying the session via auth().
// This keeps JWT decryption inside Next.js (the trust boundary) and avoids
// importing @auth/core in a CommonJS + Node-resolution context.
export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const secret = req.headers['x-internal-secret']
    const userId = req.headers['x-user-id'] as string | undefined
    const role = req.headers['x-user-role'] as string | undefined

    if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    if (!userId || !role || !roles.includes(role as Role)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    req.user = { userId, role: role as Role }
    next()
  }
}
