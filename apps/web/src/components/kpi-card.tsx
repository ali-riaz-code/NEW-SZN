import { DollarIcon, PhoneIcon, TrendArrowIcon } from './icons'
import { Sparkline } from './sparkline'

export type KpiCardIcon = 'money' | 'phone' | 'trend'

interface GoalProgress {
  pct: number
  band: 'green' | 'amber' | 'red'
}

interface KpiCardProps {
  label: string
  value: string
  icon: KpiCardIcon
  trendPct?: number
  sparklineData?: number[]
  subtext?: string
  goal?: GoalProgress
}

const GOAL_COLORS: Record<GoalProgress['band'], string> = {
  green: 'bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.35)]',
  amber: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.35)]',
  red: 'bg-red-500 shadow-[0_0_8px_rgba(248,113,113,0.35)]',
}

function CardIcon({ type }: { type: KpiCardIcon }) {
  const cls = 'flex h-7 w-7 items-center justify-center rounded-lg bg-[#c9a96e]/[0.07] border border-[#c9a96e]/[0.15] text-[#c9a96e]/80'
  if (type === 'money') return <span className={cls}><DollarIcon size={13} /></span>
  if (type === 'phone') return <span className={cls}><PhoneIcon size={13} /></span>
  return <span className={cls}><TrendArrowIcon size={13} /></span>
}

function TrendBadge({ pct }: { pct: number }) {
  const isUp = pct >= 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
        isUp ? 'bg-[#0b2a17] text-[#4ade80]' : 'bg-[#2a0b0b] text-[#f87171]'
      }`}
    >
      <span className="text-[10px]">{isUp ? '↑' : '↓'}</span>
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

// Standard KPI card — label pinned top, value+everything pinned bottom with breathing room
export function KpiCard({ label, value, icon, trendPct, sparklineData, subtext, goal }: KpiCardProps) {
  return (
    <div className="relative bg-gradient-to-br from-[#161616] to-[#0f0f0f] rounded-2xl p-6 flex flex-col min-h-[180px] border border-white/[0.06] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#c9a96e]/[0.12] hover:shadow-[0_0_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(201,169,110,0.06)] cursor-default overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a96e]/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#c9a96e]/[0.07] to-transparent pointer-events-none" />

      {/* Header — label + icon */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          {goal && (
            <span
              className={`mt-px h-2 w-2 flex-shrink-0 rounded-full ${
                goal.band === 'green'
                  ? 'bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.6)]'
                  : goal.band === 'amber'
                  ? 'bg-[#f59e0b] shadow-[0_0_6px_rgba(245,158,11,0.6)]'
                  : 'bg-[#f87171] shadow-[0_0_6px_rgba(248,113,113,0.6)]'
              }`}
            />
          )}
          <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">
            {label}
          </span>
        </div>
        <CardIcon type={icon} />
      </div>

      {/* Value section — pushed to bottom, with extra top breathing room */}
      <div className="mt-auto pt-5">
        <p className="text-3xl font-bold text-white leading-none">{value}</p>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {trendPct !== undefined && <TrendBadge pct={trendPct} />}
          {subtext && <span className="text-xs text-gray-500">{subtext}</span>}
        </div>
        {goal && (
          <div className="mt-3">
            <div className="h-[3px] w-full bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${GOAL_COLORS[goal.band]}`}
                style={{ width: `${Math.min(goal.pct, 100)}%` }}
              />
            </div>
          </div>
        )}
        {sparklineData && sparklineData.length > 1 && (
          <div className="mt-3 -mx-1">
            <Sparkline data={sparklineData} height={40} />
          </div>
        )}
      </div>
    </div>
  )
}

// Pacing card — projection card, accepts optional sparkline
export function PacingCard({ value, currency, sparklineData }: { value: string; currency: string; sparklineData?: number[] }) {
  return (
    <div className="relative bg-gradient-to-br from-[#161616] to-[#0f0f0f] rounded-2xl p-6 flex flex-col min-h-[180px] border border-white/[0.06] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#c9a96e]/[0.12] hover:shadow-[0_0_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(201,169,110,0.06)] cursor-default overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a96e]/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#c9a96e]/[0.07] to-transparent pointer-events-none" />

      <div className="flex items-start justify-between">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">
          Pacing
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c9a96e]/[0.07] border border-[#c9a96e]/[0.15] text-[#c9a96e]/80">
          <DollarIcon size={13} />
        </span>
      </div>

      <div className="mt-auto pt-5">
        <p className="text-3xl font-bold text-white leading-none">{value}</p>
        <p className="mt-2 text-xs text-gray-500">Projected monthly revenue</p>
        {sparklineData && sparklineData.length > 1 && (
          <div className="mt-3 -mx-1">
            <Sparkline data={sparklineData} height={40} />
          </div>
        )}
      </div>
    </div>
  )
}
