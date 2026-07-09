import { redirect } from 'next/navigation'
import { auth } from '../auth'
import { apiGet } from '../lib/api'
import { KpiCard, PacingCard } from '../components/kpi-card'
import { TrendChart } from '../components/trend-chart'
import { AiInsights } from '../components/ai-insights'
import { NextBestAction } from '../components/next-best-action'
import { SectionHeading } from '../components/section-heading'
import { Leaderboard } from '../components/leaderboard'
import { formatMoney, formatMultiplier, formatCount } from '../lib/format'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoalProgress {
  pct: number
  band: 'green' | 'amber' | 'red'
}

interface SparklineKpi {
  value: number
  currency?: string
  trendPct: number
  sparkline: number[]
  noShows?: number
  goal?: GoalProgress
}

interface MasterDashboardData {
  empty?: boolean
  currency: string
  period?: { month: number; year: number; label: string }
  kpis: {
    totalRevenue: SparklineKpi
    totalDealsWon: SparklineKpi
    bookedCalls: SparklineKpi
    pacing: { projectedRevenue: number; currency: string }
    totalCashCollected: SparklineKpi
    adSpend: SparklineKpi
    callsTaken: SparklineKpi
    roas: SparklineKpi
  }
  leaderboard: Array<{
    closerId: string
    name: string
    calls: number
    deals: number
    closeRate: number
    showUpRate: number
    revenueMinor: number
    currency: string
  }>
  setterSummary: Array<{
    name: string
    conversations: number
    proposals: number
    callsSet: number
    conversionRate: number
  }>
  revenueTrend: Array<{ label: string; value: number }>
  dealsTrend: Array<{ label: string; value: number }>
}

// ─── Inline sub-components ────────────────────────────────────────────────────

function GoalProgressBars({ kpis, currency }: { kpis: MasterDashboardData['kpis']; currency: string }) {
  const BAND_COLOR = { green: 'bg-green-500', amber: 'bg-amber-400', red: 'bg-red-500' }
  const BAND_TEXT = { green: 'bg-green-500/10 text-green-400', amber: 'bg-amber-400/10 text-amber-400', red: 'bg-red-500/10 text-red-400' }
  const items = [
    { label: 'Total Revenue',   goal: kpis.totalRevenue.goal,      display: formatMoney(kpis.totalRevenue.value, kpis.totalRevenue.currency ?? currency) },
    { label: 'Cash Collected',  goal: kpis.totalCashCollected.goal, display: formatMoney(kpis.totalCashCollected.value, kpis.totalCashCollected.currency ?? currency) },
    { label: 'Deals Won',       goal: kpis.totalDealsWon.goal,      display: formatCount(kpis.totalDealsWon.value) },
    { label: 'Booked Calls',    goal: kpis.bookedCalls.goal,        display: formatCount(kpis.bookedCalls.value) },
    { label: 'Calls Taken',     goal: kpis.callsTaken.goal,         display: formatCount(kpis.callsTaken.value) },
    { label: 'Ad Spend',        goal: kpis.adSpend.goal,            display: formatMoney(kpis.adSpend.value, kpis.adSpend.currency ?? currency) },
    { label: 'ROAS',            goal: kpis.roas.goal,               display: formatMultiplier(kpis.roas.value) },
  ].filter((item) => item.goal != null)

  if (items.length === 0) return null

  return (
      <div className="bg-[#111111] rounded-2xl p-5">
      <SectionHeading>Monthly Goals</SectionHeading>
      <div className="mt-4 space-y-4">
        {items.map(({ label, goal, display }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400">{label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">{display}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${BAND_TEXT[goal!.band]}`}>
                  {goal!.pct}%
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${BAND_COLOR[goal!.band]}`}
                style={{ width: `${Math.min(goal!.pct, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SetterSummary({ rows }: { rows: MasterDashboardData['setterSummary'] }) {
  if (rows.length === 0) return null

  return (
    <div className="bg-[#111111] rounded-2xl p-5">
      <SectionHeading>Setter Activity</SectionHeading>
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-800">
            <th className="pb-2 text-left font-medium">Name</th>
            <th className="pb-2 text-right font-medium">Conversations</th>
            <th className="pb-2 text-right font-medium">Proposals Sent</th>
            <th className="pb-2 text-right font-medium">Calls Set</th>
            <th className="pb-2 text-right font-medium">Conversion Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-gray-800/40 last:border-0">
              <td className="py-3 text-white font-medium">{row.name}</td>
              <td className="py-3 text-right text-gray-400">{formatCount(row.conversations)}</td>
              <td className="py-3 text-right text-gray-400">{formatCount(row.proposals)}</td>
              <td className="py-3 text-right text-gray-400">{formatCount(row.callsSet)}</td>
              <td className="py-3 text-right text-white font-semibold">{row.conversionRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <p className="text-gray-400 text-sm font-medium">No data yet</p>
        <p className="text-gray-600 text-xs mt-1">
          Data will appear once clients are added and activity is logged.
        </p>
      </div>
    </main>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MasterDashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')
  // Closers and setters have no Master Dashboard (middleware also enforces this;
  // this is defense in depth so the page can never render for them).
  if (session.user.role === 'CLOSER') redirect('/sales')
  if (session.user.role === 'SETTER') redirect('/setter')

  let data: MasterDashboardData | null = null
  let fetchError = false
  try {
    data = await apiGet<MasterDashboardData>('/api/dashboard/master')
  } catch {
    fetchError = true
  }

  if (fetchError || !data || data.empty) {
    return <EmptyState />
  }

  const { kpis, leaderboard, setterSummary, revenueTrend, dealsTrend, currency, period } = data
  const isAdmin = session.user.role === 'ADMIN'

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1800px] text-white p-6 md:p-8 animate-fade">
      {/* ── Dashboard header ──────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">Master Dashboard</h1>
        
      </div>
      {/* ── KPI Grid: 2 rows × 4 cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5 stagger-children">
        {/* Row 1 */}
        <KpiCard
          label="Total Revenue"
          value={formatMoney(kpis.totalRevenue.value, kpis.totalRevenue.currency ?? currency)}
          icon="money"
          trendPct={kpis.totalRevenue.trendPct}
          sparklineData={kpis.totalRevenue.sparkline}
        />
        <KpiCard
          label="Total Deals Won"
          value={formatCount(kpis.totalDealsWon.value)}
          icon="trend"
          trendPct={kpis.totalDealsWon.trendPct}
          sparklineData={kpis.totalDealsWon.sparkline}
        />
        <KpiCard
          label="Booked Calls"
          value={formatCount(kpis.bookedCalls.value)}
          icon="phone"
          trendPct={kpis.bookedCalls.trendPct}
          sparklineData={kpis.bookedCalls.sparkline}
        />
        <PacingCard
          value={formatMoney(kpis.pacing.projectedRevenue, kpis.pacing.currency)}
          currency={kpis.pacing.currency}
          sparklineData={kpis.totalRevenue.sparkline}
        />

        {/* Row 2 */}
        <KpiCard
          label="Total Cash Collected"
          value={formatMoney(
            kpis.totalCashCollected.value,
            kpis.totalCashCollected.currency ?? currency,
          )}
          icon="money"
          trendPct={kpis.totalCashCollected.trendPct}
          sparklineData={kpis.totalCashCollected.sparkline}
        />
        <KpiCard
          label="Ad Spend"
          value={formatMoney(kpis.adSpend.value, kpis.adSpend.currency ?? currency)}
          icon="money"
          trendPct={kpis.adSpend.trendPct}
          sparklineData={kpis.adSpend.sparkline}
        />
        <KpiCard
          label="Calls Taken"
          value={formatCount(kpis.callsTaken.value)}
          icon="phone"
          trendPct={kpis.callsTaken.trendPct}
          sparklineData={kpis.callsTaken.sparkline}
          subtext={
            kpis.callsTaken.noShows != null && kpis.callsTaken.noShows > 0
              ? `${kpis.callsTaken.noShows} no-shows`
              : undefined
          }
        />
        <KpiCard
          label="ROAS"
          value={formatMultiplier(kpis.roas.value)}
          icon="trend"
          trendPct={kpis.roas.trendPct}
          sparklineData={kpis.roas.sparkline}
        />
      </div>

      {/* ── Monthly Goals — only renders when goals are configured ── */}
      <div className="mt-8">
        <GoalProgressBars kpis={kpis} currency={currency} />
      </div>

      {/* ── Setter Activity (admin only) ─────────────────────────────────── */}
      {isAdmin && setterSummary.length > 0 && (
        <div className="mt-6">
          <SetterSummary rows={setterSummary} />
        </div>
      )}

      {/* ── Interactive Trend Charts ────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        <TrendChart
          title="Revenue Trend · last 6 months"
          data={revenueTrend.map((r) => r.value)}
          labels={revenueTrend.map((r) => r.label)}
          format="money"
          currency={currency}
          pointPrefix=""
          subtitle={formatMoney(revenueTrend.reduce((s, r) => s + r.value, 0), currency)}
        />
        <TrendChart
          title="Deals Won · last 6 months"
          data={dealsTrend.map((d) => d.value)}
          labels={dealsTrend.map((d) => d.label)}
          format="count"
          pointPrefix=""
          subtitle={String(dealsTrend.reduce((s, d) => s + d.value, 0))}
        />
      </div>

      {/* ── AI: Insights + Next Best Action (NBA is internal-only — its API
             rejects CLIENT, so don't render it an error card) ─────────────── */}
      <div className={`mt-6 grid grid-cols-1 gap-4 md:gap-5 ${isAdmin ? 'md:grid-cols-2' : ''}`}>
        <AiInsights dashboard="master" />
        {isAdmin && <NextBestAction />}
      </div>

      {/* ── Leaderboard ─────────────────────────────────────────────────── */}
      <div className="mt-6">
        <Leaderboard rows={leaderboard} />
      </div>
    </main>
  )
}
