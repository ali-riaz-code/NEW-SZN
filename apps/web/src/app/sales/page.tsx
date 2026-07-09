import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { apiGet } from '@/lib/api'
import { formatMoney, formatCount, formatPct } from '@/lib/format'
import { Sparkline } from '@/components/sparkline'
import { TrendChart } from '@/components/trend-chart'
import { LogCallForm } from './log-call-form'
import { AiInsights } from '@/components/ai-insights'
import { NextBestAction } from '@/components/next-best-action'
import { FollowUpList, type FollowUpRow } from '@/app/follow-ups/follow-up-list'
import { Leaderboard, type LeaderboardRow } from '@/components/leaderboard'
import { TodayCallLogTable, type TodayCallRow } from './call-log-table'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Kpi {
  value: number
  currency?: string
  trendPct: number
  goal?: { pct: number; band: 'green' | 'amber' | 'red' }
  sparkline?: number[]
}

interface SalesMetrics {
  empty?: boolean
  currency: string
  clientId: string
  clientName?: string
  period?: { month: number; year: number; label: string }
  accountabilityLock: { locked: boolean }
  kpis: {
    revenue: Kpi
    cashCollected: Kpi
    dealsWonLost: { won: number; lost: number; trendPct: number; goal?: Kpi['goal']; sparkline?: number[] }
    closeRate: Kpi
    showUpRate: Kpi
    deposits: { count: number; estValueMinor: number; currency: string; sparkline?: number[] }
    revenuePerCall: Kpi
    cashPerCall: Kpi
    cashUpfrontPct: Kpi
    pifPct: Kpi
    avgDeal: Kpi
    avgCash: Kpi
  }
  objections: Array<{ type: string; count: number }>
  outcomeBreakdown: Array<{ outcome: string; count: number }>
  revenueTrend: Array<{ day: number; cumulativeRevenue: number }>
  recentCalls: TodayCallRow[]
  closers: Array<{ id: string; name: string }>
}

// ─── Presentation helpers ───────────────────────────────────────────────────────

const GOAL_COLORS: Record<string, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-400',
  red: 'bg-red-500',
}

const OUTCOME_COLORS: Record<string, string> = {
  CLOSED_PIF: '#22c55e',
  CLOSED_SPLIT_PAY: '#4ade80',
  CLOSED_DEPOSIT: '#86efac',
  OFFER_DECLINED: '#f59e0b',
  NOT_A_FIT: '#f87171',
  NO_SHOW: '#a1a1aa',
  CANCELLED: '#71717a',
  RESCHEDULED: '#52525b',
  DRAG_OVER_SHOW: '#c9a96e',
}

function outcomeLabel(o: string): string {
  return o.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function MetricCard({
  label,
  value,
  unit,
  trendPct,
  goal,
  sparkline,
}: {
  label: string
  value: string
  unit?: string
  trendPct?: number
  goal?: { pct: number; band: 'green' | 'amber' | 'red' }
  sparkline?: number[]
}) {
  const isUp = (trendPct ?? 0) >= 0
  return (
    <div className="relative bg-gradient-to-br from-[#161616] to-[#0f0f0f] rounded-2xl p-5 flex flex-col min-h-[135px] border border-white/[0.06] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#c9a96e]/[0.12] hover:shadow-[0_0_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(201,169,110,0.06)] cursor-default overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a96e]/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#c9a96e]/[0.07] to-transparent pointer-events-none" />
      <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">{label}</span>
      <div className="mt-auto pt-3">
        <p className="text-2xl font-bold text-white leading-none tracking-tight">
          {value}
          {unit && <span className="text-base text-gray-400 ml-1">{unit}</span>}
        </p>
        {trendPct !== undefined && trendPct !== 0 && (
          <span
            className={`mt-2 inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
              isUp ? 'bg-[#0b2a17] text-[#4ade80]' : 'bg-[#2a0b0b] text-[#f87171]'
            }`}
          >
            <span className="text-[10px]">{isUp ? '↑' : '↓'}</span>
            {Math.abs(trendPct).toFixed(1)}%
          </span>
        )}
        {goal && (
          <div className="mt-3 h-[3px] w-full bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${GOAL_COLORS[goal.band]}`}
              style={{ width: `${Math.min(goal.pct, 100)}%` }}
            />
          </div>
        )}
        {sparkline && sparkline.length > 1 && (
          <div className="mt-2 -mx-1">
            <Sparkline data={sparkline} height={36} />
          </div>
        )}
      </div>
    </div>
  )
}

// Converts the cumulative revenue trend into per-day values and renders via
// the shared TrendChart so the chart shows discrete daily revenue, not a running total.
function DailyRevenueTrendChart({
  data,
  currency,
}: {
  data: SalesMetrics['revenueTrend']
  currency: string
}) {
  const daily = data.map((d, i) =>
    i === 0 ? d.cumulativeRevenue : d.cumulativeRevenue - (data[i - 1]?.cumulativeRevenue ?? 0),
  )
  const labels = data.map((d) => d.day)
  const totalRevenue = data[data.length - 1]?.cumulativeRevenue ?? 0
  return (
    <TrendChart
      title="Daily Revenue"
      data={daily}
      labels={labels}
      format="money"
      currency={currency}
      subtitle={formatMoney(totalRevenue, currency)}
      pointPrefix="Day "
    />
  )
}

function OutcomePie({ data }: { data: SalesMetrics['outcomeBreakdown'] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  const present = data.filter((d) => d.count > 0)
  if (total === 0) {
    return (
      <div className="bg-[#111111] rounded-2xl p-5">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500 mb-4">Outcome Mix</h3>
        <div className="h-40 flex items-center justify-center text-gray-700 text-xs">No calls this month</div>
      </div>
    )
  }
  const R = 60
  const C = 70
  const circ = 2 * Math.PI * R
  let offset = 0
  const segments = present.map((d) => {
    const frac = d.count / total
    const seg = {
      color: OUTCOME_COLORS[d.outcome] ?? '#666',
      dash: frac * circ,
      offset: offset * circ,
      label: outcomeLabel(d.outcome),
      count: d.count,
      pct: Math.round(frac * 100),
    }
    offset += frac
    return seg
  })

  return (
    <div className="bg-[#111111] rounded-2xl p-5">
      <h3 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500 mb-4">Outcome Mix</h3>
      <div className="flex items-center gap-5">
        <svg width={140} height={140} viewBox="0 0 140 140" className="-rotate-90">
          {segments.map((s, i) => (
            <circle
              key={i}
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={16}
              strokeDasharray={`${s.dash} ${circ - s.dash}`}
              strokeDashoffset={-s.offset}
            />
          ))}
          <circle cx={C} cy={C} r={R - 16} fill="#111111" />
        </svg>
        <div className="flex-1 space-y-1.5">
          {segments.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="text-gray-300 flex-1">{s.label}</span>
              <span className="text-gray-500">{s.count}</span>
              <span className="text-gray-600 w-9 text-right">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const OBJECTION_TYPES = [
  { type: 'THINK_ABOUT_IT', label: 'Think About It' },
  { type: 'MONEY',          label: 'Money' },
  { type: 'TIME',           label: 'Time' },
  { type: 'PARTNER',        label: 'Partner' },
  { type: 'FEAR',           label: 'Fear' },
  { type: 'VALUE',          label: 'Value' },
]

function ObjectionKpis({ data }: { data: SalesMetrics['objections'] }) {
  const countMap = Object.fromEntries(data.map((o) => [o.type, o.count]))
  const total = OBJECTION_TYPES.reduce((s, o) => s + (countMap[o.type] ?? 0), 0)
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 stagger-children">
      {OBJECTION_TYPES.map(({ type, label }) => {
        const count = countMap[type] ?? 0
        const pct = total > 0 ? (count / total) * 100 : 0
        return (
          <div
            key={type}
            className="relative bg-[#111111] rounded-2xl p-4 flex flex-col justify-between min-h-[96px] border border-white/[0.06] cursor-default overflow-hidden"
          >
            <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">{label}</span>
            <div>
              <p className="text-2xl font-bold text-white leading-none tracking-tight">{count}</p>
              <p className="mt-1 text-[11px] text-gray-500">{pct.toFixed(1)}%</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface FollowUpsResp {
  clientId: string | null
  currency: string
  rows: FollowUpRow[]
}

export default async function SalesPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const role = session.user.role
  if (role !== 'CLOSER' && role !== 'ADMIN') redirect('/')
  const isAdmin = role === 'ADMIN'

  const [data, followUpsData, leaderboardData] = await Promise.all([
    apiGet<SalesMetrics>('/api/sales/metrics').catch(() => null),
    apiGet<FollowUpsResp>('/api/follow-ups').catch(() => null),
    // Closer-only: the team leaderboard stays GLOBAL (not isolated to the
    // logged-in closer) so they can see their rank — competitive motivation.
    !isAdmin
      ? apiGet<{ leaderboard: LeaderboardRow[] }>('/api/dashboard/leaderboard').catch(() => null)
      : Promise.resolve(null),
  ])

  if (!data || data.empty) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <p className="text-gray-400 text-sm font-medium">No sales data yet</p>
          <p className="text-gray-600 text-xs mt-1">Log your first call to start tracking performance.</p>
        </div>
      </main>
    )
  }

  const { kpis, currency, period, clientName } = data
  const locked = data.accountabilityLock.locked

  return (
    <main className="min-h-screen text-white p-6 md:p-8 animate-fade">
      <div className="mb-6">
        <h1 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">Sales &amp; Closing</h1>
      </div>

      <div className={`grid grid-cols-1 ${!isAdmin ? 'md:grid-cols-2 lg:grid-cols-3' : ''} gap-4`}>
        {/* Left: metrics (blurred + locked overlay until first call of the day) */}
        <div className={`${!isAdmin ? 'md:col-span-1 lg:col-span-2' : ''} relative`}>
          <div className={locked ? 'pointer-events-none blur-md select-none' : ''}>
            {/* 12 KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
              <MetricCard label="Revenue"          value={formatMoney(kpis.revenue.value, currency)}                                                              trendPct={kpis.revenue.trendPct} />
              <MetricCard label="Cash Collected"   value={formatMoney(kpis.cashCollected.value, currency)}                                                        trendPct={kpis.cashCollected.trendPct} />
              <MetricCard label="Deals Won / Lost" value={`${formatCount(kpis.dealsWonLost.won)} / ${formatCount(kpis.dealsWonLost.lost)}`}                      trendPct={kpis.dealsWonLost.trendPct} />
              <MetricCard label="Close Rate"       value={formatPct(kpis.closeRate.value)}                                                                        trendPct={kpis.closeRate.trendPct} />
              <MetricCard label="Show-up Rate"     value={formatPct(kpis.showUpRate.value)}                                                                       trendPct={kpis.showUpRate.trendPct} />
              <MetricCard label="Deposits"         value={formatCount(kpis.deposits.count)}                                                                       unit={kpis.deposits.count > 0 ? `≈ ${formatMoney(kpis.deposits.estValueMinor, currency)}` : undefined} />
              <MetricCard label="Revenue / Call"   value={formatMoney(kpis.revenuePerCall.value, currency)} />
              <MetricCard label="Cash / Call"      value={formatMoney(kpis.cashPerCall.value, currency)} />
              <MetricCard label="Cash Upfront %"   value={formatPct(kpis.cashUpfrontPct.value)} />
              <MetricCard label="PIF %"            value={formatPct(kpis.pifPct.value)} />
              <MetricCard label="Avg Deal"         value={formatMoney(kpis.avgDeal.value, currency)} />
              <MetricCard label="Avg Cash"         value={formatMoney(kpis.avgCash.value, currency)} />
            </div>

            <div className="mt-4">
              <ObjectionKpis data={data.objections} />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4">
              <DailyRevenueTrendChart data={data.revenueTrend} currency={currency} />
              <OutcomePie data={data.outcomeBreakdown} />
              <TodayCallLogTable
                rows={data.recentCalls}
                isAdmin={isAdmin}
                closers={data.closers}
              />
            </div>
          </div>

          {locked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-[#111111] border border-white/10 rounded-2xl px-8 py-6 text-center max-w-xs shadow-2xl">
                <div className="text-3xl mb-2">🔒</div>
                <p className="text-white text-sm font-semibold">Log your first call to unlock</p>
                <p className="text-gray-500 text-xs mt-1.5">
                  Your dashboard stays locked until you log at least one call today. Accountability first.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Log Call form — closers only. Admins don't log calls on behalf. */}
        {!isAdmin && (
          <div className="md:col-span-1">
            <LogCallForm clientId={data.clientId} />
          </div>
        )}
      </div>

      {/* ── Top Performers — closers see the GLOBAL team ranking (exception
             to closer data isolation, for competitive motivation) ─────────── */}
      {!isAdmin && leaderboardData && leaderboardData.leaderboard.length > 0 && (
        <div className="mt-4">
          <Leaderboard
            rows={leaderboardData.leaderboard}
            title="Top Performers — Team Leaderboard"
            highlightCloserId={session.user.userId}
          />
        </div>
      )}

      {/* ── AI Insights ─────────────────────────────────────────────────── */}
      <div className="mt-4">
        <AiInsights dashboard="sales" clientId={data.clientId} />
      </div>

      {/* ── Next Best Action ─────────────────────────────────────────────── */}
      <div className="mt-4">
        <NextBestAction />
      </div>

      {/* ── Follow-up Queue ─────────────────────────────────────────────── */}
      {followUpsData && followUpsData.rows.length > 0 && (
        <div className="mt-4 bg-[#111111] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">Follow-up Queue</h3>
            <span className="text-[11px] text-gray-500">
              {followUpsData.rows.length} open
              {followUpsData.rows.filter((r) => r.currentTag === 'HOT_FOLLOW_UP').length > 0 && (
                <span className="text-[#f87171]">
                  {' '}· {followUpsData.rows.filter((r) => r.currentTag === 'HOT_FOLLOW_UP').length} hot
                </span>
              )}
            </span>
          </div>
          <FollowUpList rows={followUpsData.rows} showCloser={isAdmin} />
        </div>
      )}
    </main>
  )
}
