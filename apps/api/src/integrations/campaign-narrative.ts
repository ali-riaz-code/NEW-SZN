// Campaign Narrative — a 1–2 sentence AI summary generated after each Facebook
// sync and stored on the AdSyncLog row. See docs/ai-features.md.
//
// Never throws: if AI isn't configured or the call fails, returns null so the sync
// still succeeds. The narrative is a nice-to-have, not a hard dependency.

import { prisma } from '@new-szn/db'
import { currentMonthRange } from '@new-szn/db/kpi'
import { chatComplete, isAiConfigured } from './openai'
import { formatMoneyCompact } from '../lib/money'
import { getAiTone } from '../lib/ai-config'

// refDate anchors the month summarized (default now). The cron passes nothing;
// verification passes a month that actually has ad data.
export async function generateCampaignNarrative(
  clientId: string,
  refDate: Date = new Date(),
): Promise<string | null> {
  if (!isAiConfigured()) return null
  try {
    const { start, end } = currentMonthRange(refDate)
    const [client, metrics] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId }, select: { name: true, currency: true } }),
      prisma.adDailyMetric.findMany({
        where: { clientId, date: { gte: start, lte: end } },
        select: { dailySpendMinor: true, results: true, impressions: true, clicks: true, reach: true },
      }),
    ])
    if (!client || metrics.length === 0) return null

    const currency = client.currency
    const spend = metrics.reduce((s, m) => s + m.dailySpendMinor, 0)
    const results = metrics.reduce((s, m) => s + (m.results ?? 0), 0)
    const impressions = metrics.reduce((s, m) => s + (m.impressions ?? 0), 0)
    const clicks = metrics.reduce((s, m) => s + (m.clicks ?? 0), 0)
    const cpr = results > 0 ? formatMoneyCompact(Math.round(spend / results), currency) : 'n/a'
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0'

    // Campaign Narrative is an Ads feature → 'ads' personality (Phase 11).
    const tone = await getAiTone('ads')

    return await chatComplete(
      [
        {
          role: 'system',
          content:
            'You are a paid-media analyst. Write a punchy 1–2 sentence narrative summarizing ' +
            'this month\'s ad performance for an agency dashboard. Be concrete, mention the ' +
            'standout number, and avoid fluff. No markdown.' +
            (tone ? ` Adopt this tone: ${tone}.` : ''),
        },
        {
          role: 'user',
          content: [
            `Client: ${client.name}`,
            `Spend MTD: ${formatMoneyCompact(spend, currency)}`,
            `Leads/results: ${results}`,
            `Cost per result: ${cpr}`,
            `CTR: ${ctr}%`,
            `Impressions: ${impressions}`,
          ].join('\n'),
        },
      ],
      { temperature: 0.6, maxTokens: 120 },
    )
  } catch (err) {
    console.error('[campaign-narrative] failed', err)
    return null
  }
}
