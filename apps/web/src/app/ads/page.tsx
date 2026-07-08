import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { apiGet } from '@/lib/api'
import { formatMoney, formatCount, formatPct, formatMultiplier } from '@/lib/format'
import { Sparkline } from '@/components/sparkline'
import { SyncButton, LastUpdatedLabel } from './sync-button'
import { CampaignTable, type CampaignRow } from './campaign-table'
import { DailySpendChart } from './daily-spend-chart'
import { ClientSelector } from './client-selector'
import { AiInsights } from '@/components/ai-insights'
import { NextBestAction } from '@/components/next-best-action'

interface AdKpi {
  value: number
  currency?: string
  trendPct: number
}

function trendSparkline(trendPct: number): number[] {
  const t = Math.max(-1, Math.min(1, trendPct / 100))
  return Array.from({ length: 12 }, (_, i) => 1 + t * (i / 11) * (i / 11))
}

interface AdMetrics {
  empty?: boolean
  currency: string
  clientId: string
  hasAdAccount: boolean
  kpis?: {
    spend: AdKpi
    leads: AdKpi
    costPerFollower: AdKpi
    costPerConversation: AdKpi
    roasCash: AdKpi
    roasRev: AdKpi
    costPerCall: AdKpi
    costPerCustomer: AdKpi
    ctr: AdKpi
    cpm: AdKpi
    cpc: AdKpi
  }
}

interface SyncStatus {
  empty?: boolean
  hasAdAccount: boolean
  lastSuccessAt: string | null
  lastStatus: string | null
  lastError: string | null
  narrative: string | null
  cooldownRemainingMs: number
  cooldownMs: number
  canSync: boolean
}

interface CampaignsResp {
  currency: string
  clientId: string
  rows: CampaignRow[]
}

interface AdsClient {
  id: string
  name: string
}

interface AdsClientsResp {
  clients: AdsClient[]
}

function Card({
  label,
  value,
  trendPct,
  valueColor,
  sparkline,
}: {
  label: string
  value: string
  trendPct?: number
  valueColor?: string
  sparkline?: number[]
}) {
  const isUp = (trendPct ?? 0) >= 0
  return (
    <div className="relative bg-gradient-to-br from-[#161616] to-[#0f0f0f] rounded-2xl p-4 flex flex-col justify-between min-h-[104px] border border-white/[0.06] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#c9a96e]/[0.12] hover:shadow-[0_0_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(201,169,110,0.06)] cursor-default overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a96e]/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#c9a96e]/[0.07] to-transparent pointer-events-none" />
      <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">{label}</span>
      <div>
        <p className={`text-xl font-bold leading-none tracking-tight ${valueColor ?? 'text-white'}`}>{value}</p>
        {trendPct !== undefined && trendPct !== 0 && (
          <span
            className={`mt-1.5 inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
              isUp ? 'bg-[#0b2a17] text-[#4ade80]' : 'bg-[#2a0b0b] text-[#f87171]'
            }`}
          >
            <span className="text-[9px]">{isUp ? '↑' : '↓'}</span>
            {Math.abs(trendPct).toFixed(1)}%
          </span>
        )}
        {sparkline && sparkline.length > 1 && (
          <div className="mt-2 -mx-1">
            <Sparkline data={sparkline} height={28} />
          </div>
        )}
      </div>
    </div>
  )
}

export default async function AdsPage({ searchParams }: { searchParams: { clientId?: string } }) {
  const session = await auth()
  if (!session) redirect('/login')
  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'CLIENT') redirect('/')

  // Fetch client list for the selector (ADMIN only); resolve the active clientId.
  const adsClients = role === 'ADMIN'
    ? await apiGet<AdsClientsResp>('/api/ads/clients').catch(() => null)
    : null
  const clients = adsClients?.clients ?? []

  // Validate the requested clientId against the actual list so a stale URL
  // can't silently lock the selector to a removed client.
  const requestedId = searchParams.clientId
  const resolvedClientId = clients.find((c) => c.id === requestedId)?.id ?? clients[0]?.id

  const qp = resolvedClientId ? { clientId: resolvedClientId } : undefined

  const [metrics, status, campaigns] = await Promise.all([
    apiGet<AdMetrics>('/api/ads/metrics', qp).catch(() => null),
    apiGet<SyncStatus>('/api/ads/sync-status', qp).catch(() => null),
    apiGet<CampaignsResp>('/api/ads/campaigns', qp).catch(() => null),
  ])

  const currency = metrics?.currency ?? 'DKK'
  const k = metrics?.kpis
  const hasAdAccount = metrics?.hasAdAccount ?? status?.hasAdAccount ?? false

  return (
    <main className="min-h-screen text-white p-6 md:p-8 animate-fade">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">Ads</h1>
          {role === 'ADMIN' && clients.length > 1 && resolvedClientId && (
            <ClientSelector clients={clients} currentClientId={resolvedClientId} />
          )}
        </div>
        {/* Sync is admin-only. Clients never see the button (no manual API
            triggers / rate-limit risk) — just a read-only freshness label. */}
        {status && role === 'ADMIN' && (
          <SyncButton
            initialCooldownMs={status.cooldownRemainingMs}
            isAdmin
            cooldownMs={status.cooldownMs ?? 15 * 60 * 1000}
            lastSuccessAt={status.lastSuccessAt}
            clientId={resolvedClientId}
          />
        )}
        {status && role !== 'ADMIN' && (
          <LastUpdatedLabel lastSuccessAt={status.lastSuccessAt} />
        )}
      </div>

      {!hasAdAccount && (
        <div className="mb-4 bg-[#1a1206] border border-[#c9a96e]/20 rounded-2xl p-4 text-sm text-[#c9a96e]/90">
          No Meta ad account is connected for this client. Add a <span className="font-mono">metaAdAccountId</span> in
          Settings to enable syncing.
        </div>
      )}

      {status?.lastStatus === 'FAILED' && status.lastError && (
        <div className="mb-4 bg-[#2a0b0b] border border-red-500/20 rounded-2xl p-4 text-sm text-red-300">
          Last sync failed: {status.lastError}
        </div>
      )}

      {/* AI Campaign Narrative */}
      {status?.narrative && (
        <div className="mb-4 bg-[#111111] rounded-2xl p-5 border border-[#c9a96e]/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#c9a96e]">✦</span>
            <h3 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">Campaign Narrative</h3>
          </div>
          <p className="text-sm text-gray-200 leading-relaxed">{status.narrative}</p>
        </div>
      )}

      {/* Headline cards — 8 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        <Card label="Total Spend"     value={k ? formatMoney(k.spend.value, currency) : formatMoney(0, currency)}                                         trendPct={k?.spend.trendPct} />
        <Card label="Total Followers" value={k ? formatCount(k.leads.value) : '0'}                                                                        trendPct={k?.leads.trendPct} />
        <Card label="Cost / Follower" value={k && k.costPerFollower.value > 0 ? formatMoney(k.costPerFollower.value, currency) : '—'}                      trendPct={k?.costPerFollower.trendPct} />
        <Card label="Cost / Convo"    value={k && k.costPerConversation.value > 0 ? formatMoney(k.costPerConversation.value, currency) : '—'}              trendPct={k?.costPerConversation.trendPct} />
        <Card label="ROAS Cash"       value={k && k.roasCash.value > 0 ? formatMultiplier(k.roasCash.value) : '—'}                                        trendPct={k?.roasCash.trendPct} />
        <Card label="ROAS Rev"        value={k && k.roasRev.value > 0 ? formatMultiplier(k.roasRev.value) : '—'}                                          trendPct={k?.roasRev.trendPct} valueColor={k && k.roasRev.value > 0 ? 'text-[#4ade80]' : undefined} />
        <Card label="Cost / Call"     value={k && k.costPerCall.value > 0 ? formatMoney(k.costPerCall.value, currency) : '—'}                             trendPct={k?.costPerCall.trendPct} />
        <Card label="Cost / Customer" value={k && k.costPerCustomer.value > 0 ? formatMoney(k.costPerCustomer.value, currency) : '—'}                     trendPct={k?.costPerCustomer.trendPct} />
      </div>

      {/* Daily Spend Trend Chart */}
      <DailySpendChart clientId={resolvedClientId} />

      {/* Campaign table — always rendered; empty state handled inside */}
      <div className="mt-4">
        <CampaignTable rows={campaigns?.rows ?? []} canFlag={role === 'ADMIN'} />
      </div>

      {/* ── AI Insights ─────────────────────────────────────────────────── */}
      <div className="mt-4">
        <AiInsights dashboard="ads" />
      </div>

      {/* ── Next Best Action — admin only (CLIENT role blocked by NBA API) ── */}
      {role === 'ADMIN' && (
        <div className="mt-4">
          <NextBestAction />
        </div>
      )}
    </main>
  )
}
