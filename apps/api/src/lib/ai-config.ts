// AI coaching personality loader (Phase 11).
//
// Reads the agency-wide, per-dashboard `tone` from AiConfig and feeds it into the
// existing opts.tone seam on the AI generators. An absent row = default voice
// (undefined tone → generators skip the "Adopt this tone" instruction).
//
// Dashboard mapping for the generators that aren't tied to an explicit dashboard:
//   - Next Best Action  → 'master'
//   - Loss Debrief      → 'sales'
//   - Campaign Narrative→ 'ads'
//   - Daily Targets     → per recipient role: CLOSER → 'sales', SETTER → 'setter'

import { prisma } from '@new-szn/db'
import type { DashboardKind } from '../integrations/ai-insights'

export type { DashboardKind }

// The configured tone for a dashboard, or undefined (default voice).
export async function getAiTone(dashboard: DashboardKind): Promise<string | undefined> {
  const row = await prisma.aiConfig.findUnique({
    where: { dashboard },
    select: { tone: true },
  })
  return row?.tone?.trim() || undefined
}
