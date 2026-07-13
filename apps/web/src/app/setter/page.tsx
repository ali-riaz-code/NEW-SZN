import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { apiGet } from '@/lib/api'
import { formatCount, formatPct } from '@/lib/format'
import { Sparkline } from '@/components/sparkline'
import { LogDayForm } from './log-day-form'
import { AiInsights } from '@/components/ai-insights'
import { NextBestAction } from '@/components/next-best-action'
import { BookingTrendChart } from './booking-trend-chart'
import { ActivityHeatmap } from './activity-heatmap'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KpiMetric {
  value: number
  trendPct: number
  goal?: { pct: number; band: 'green' | 'amber' | 'red' }
  sparkline?: number[]
}

interface SetterMetrics {
  empty?: boolean
  currency: string
  clientId?: string
  kpis: {
    newConvos: KpiMetric
    responses: KpiMetric
    callProposals: KpiMetric
    bookedCalls: KpiMetric
    followUps: KpiMetric
    leadResponsePct: KpiMetric
    proposalResponsePct: KpiMetric
    callProposalPct: KpiMetric
    callLeadPct: KpiMetric
    pacing: { projected: number; target: number; sparkline?: number[] }
  }
  bookingTrend: Array<{ date: string; bookedCalls: number }>
  heatmap: Array<{ date: string; value: number; bookedCalls: number }>
  streaks: { current: number; best: number; totalDays: number; tier: string }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const GOAL_COLORS: Record<string, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-400',
  red: 'bg-red-500',
}

function MetricCard({
  label,
  value,
  unit = '',
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
    <div className="relative bg-gradient-to-br from-[#161616] to-[#0f0f0f] rounded-2xl p-5 flex flex-col min-h-[145px] border border-white/[0.06] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#c9a96e]/[0.12] hover:shadow-[0_0_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(201,169,110,0.06)] cursor-default overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a96e]/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#c9a96e]/[0.07] to-transparent pointer-events-none" />
      <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">
        {label}
      </span>
      <div className="mt-auto pt-4">
        <p className="text-3xl font-bold text-white leading-none">
          {value}
          {unit && <span className="text-lg text-gray-400 ml-1">{unit}</span>}
        </p>
        {trendPct !== undefined && (
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
            <Sparkline data={sparkline} height={22} minimal />
          </div>
        )}
      </div>
    </div>
  )
}

function StreakPanel({ streaks }: { streaks: SetterMetrics['streaks'] }) {
  return (
    <div className="bg-[#111111] rounded-2xl p-5">
      <h3 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500 mb-4">
        Streaks
      </h3>
      <div className="grid grid-cols-4 gap-3 text-center">
        <div>
          <p className="text-2xl font-bold text-white">{streaks.current}</p>
          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Current</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{streaks.best}</p>
          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Best</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{streaks.totalDays}</p>
          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Total Days</p>
        </div>
        <div>
          <p className="text-lg font-bold text-[#c9a96e]">{streaks.tier}</p>
          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Tier</p>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SetterPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = session.user.role
  if (role !== 'SETTER' && role !== 'ADMIN') redirect('/')

  let data: SetterMetrics | null = null
  try {
    data = await apiGet<SetterMetrics>('/api/setter/metrics')
  } catch {
    // fall through to zero fallback
  }

  // Setters see the full dashboard with zeros + the log form even before any data.
  if (!data || data.empty) {
    data = {
      empty: false,
      currency: data?.currency ?? 'USD',
      clientId: data?.clientId,
      kpis: {
        newConvos: { value: 0, trendPct: 0 },
        responses: { value: 0, trendPct: 0 },
        callProposals: { value: 0, trendPct: 0 },
        bookedCalls: { value: 0, trendPct: 0 },
        followUps: { value: 0, trendPct: 0 },
        leadResponsePct: { value: 0, trendPct: 0 },
        proposalResponsePct: { value: 0, trendPct: 0 },
        callProposalPct: { value: 0, trendPct: 0 },
        callLeadPct: { value: 0, trendPct: 0 },
        pacing: { projected: 0, target: 0 },
      },
      bookingTrend: [],
      heatmap: [],
      streaks: { current: 0, best: 0, totalDays: 0, tier: 'Bronze' },
    }
  }

  const { kpis, bookingTrend, heatmap, streaks } = data

  return (
    <main className="min-h-screen text-white p-6 md:p-8 animate-fade">
      <h1 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500 mb-8">
        Appointment Setting
      </h1>

      {/* ── Metric Cards: 6 funnel cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 md:gap-4 stagger-children">
        <MetricCard label="Leads"          value={formatCount(kpis.newConvos.value)}    trendPct={kpis.newConvos.trendPct}    goal={kpis.newConvos.goal}    sparkline={kpis.newConvos.sparkline} />
        <MetricCard label="Responses"      value={formatCount(kpis.responses.value)}    trendPct={kpis.responses.trendPct}                                  sparkline={kpis.responses.sparkline} />
        <MetricCard label="Call Proposals" value={formatCount(kpis.callProposals.value)} trendPct={kpis.callProposals.trendPct}                             sparkline={kpis.callProposals.sparkline} />
        <MetricCard label="Calls Booked"   value={formatCount(kpis.bookedCalls.value)}  trendPct={kpis.bookedCalls.trendPct}  goal={kpis.bookedCalls.goal}  sparkline={kpis.bookedCalls.sparkline} />
        <MetricCard label="Follow-ups"     value={formatCount(kpis.followUps.value)}    trendPct={kpis.followUps.trendPct}                                  sparkline={kpis.followUps.sparkline} />
        <MetricCard
          label="Pacing"
          value={formatCount(kpis.pacing.projected)}
          unit={kpis.pacing.target > 0 ? `/ ${kpis.pacing.target}` : ''}
          sparkline={kpis.pacing.sparkline}
        />
      </div>

      {/* ── 4 rate cards ──────────────────────────────────────────────── */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 stagger-children">
        <MetricCard label="Lead/Response %"      value={formatPct(kpis.leadResponsePct.value)}      trendPct={kpis.leadResponsePct.trendPct}      sparkline={kpis.leadResponsePct.sparkline} />
        <MetricCard label="Proposal/Response %"  value={formatPct(kpis.proposalResponsePct.value)}  trendPct={kpis.proposalResponsePct.trendPct}  sparkline={kpis.proposalResponsePct.sparkline} />
        <MetricCard label="Call/Proposal %"      value={formatPct(kpis.callProposalPct.value)}      trendPct={kpis.callProposalPct.trendPct}      sparkline={kpis.callProposalPct.sparkline} />
        <MetricCard label="Call/Lead %"          value={formatPct(kpis.callLeadPct.value)}          trendPct={kpis.callLeadPct.trendPct}          sparkline={kpis.callLeadPct.sparkline} />
      </div>

      {/* ── Booking Trend + Streaks ───────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <BookingTrendChart data={bookingTrend} />
        </div>
        <div>
          <StreakPanel streaks={streaks} />
        </div>
      </div>

      {/* ── Heatmap + Log Day (Log Day is Setter-only; Admin gets a clean macro view) ── */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className={role === 'SETTER' ? 'md:col-span-2' : 'md:col-span-3'}>
          <ActivityHeatmap data={heatmap} />
        </div>
        {role === 'SETTER' && (
          <div>
            <LogDayForm clientId={data.clientId ?? ''} />
          </div>
        )}
      </div>

      {/* ── AI Insights ───────────────────────────────────────────────── */}
      <div className="mt-4">
        <AiInsights dashboard="setter" clientId={data.clientId} />
      </div>

      {/* ── Next Best Action ──────────────────────────────────────────── */}
      <div className="mt-4">
        <NextBestAction />
      </div>
    </main>
  )
}
