import dotenv from 'dotenv'
import path from 'path'
// Load from monorepo root .env (apps/api runs with cwd = apps/api/, so ../../ = root)
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

import express from 'express'
import cors from 'cors'
import adminRouter from './routes/admin'
import authRouter from './routes/auth'
import dashboardRouter from './routes/dashboard'
import setterRouter from './routes/setter'
import { callsRouter, salesRouter } from './routes/calls'
import adsRouter from './routes/ads'
import aiRouter from './routes/ai'
import settingsRouter from './routes/settings'
import followUpsRouter from './routes/follow-ups'
import reportsRouter from './routes/reports'
import { startCron } from './cron'

const app = express()
const PORT = process.env['API_PORT'] ?? 4000

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/admin', adminRouter)
app.use('/api/auth', authRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/setter', setterRouter)
app.use('/api/calls', callsRouter)
app.use('/api/sales', salesRouter)
app.use('/api/ads', adsRouter)
app.use('/api/ai', aiRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/follow-ups', followUpsRouter)
app.use('/api/reports', reportsRouter)

// Generic error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  const msg = process.env.NODE_ENV !== 'production' && err instanceof Error ? err.message : 'Internal server error'
  res.status(500).json({ error: msg })
})

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
  // Background jobs (Facebook sync, etc.). Disabled during tests via DISABLE_CRON.
  if (process.env.DISABLE_CRON !== '1') {
    startCron()
  }
})
