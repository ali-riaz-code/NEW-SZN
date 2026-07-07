'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchDailySpendAction } from './actions'

type Preset = '7D' | '14D' | '30D' | 'MTD'

const PRESETS: { id: Preset; label: string }[] = [
  { id: '7D', label: '7D' },
  { id: '14D', label: '14D' },
  { id: '30D', label: '30D' },
  { id: 'MTD', label: 'MTD' },
]

function presetDates(preset: Preset): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().slice(0, 10)
  if (preset === 'MTD') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    return { from, to }
  }
  const days = preset === '7D' ? 7 : preset === '14D' ? 14 : 30
  const from = new Date(now.getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10)
  return { from, to }
}

function fmtSpend(minorUnits: number): string {
  const v = minorUnits / 100
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return `$${Math.round(v)}`
}

interface Point { date: string; spendMinor: number }

const COLOR = '#c9a96e'
const W = 480, H = 140, PADL = 58, PADR = 12, PADT = 12, PADB = 24
const cW = W - PADL - PADR
const cH = H - PADT - PADB

export function DailySpendChart({ clientId }: { clientId?: string }) {
  const [preset, setPreset] = useState<Preset>('30D')
  const [points, setPoints] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const { from, to } = presetDates(preset)
    setLoading(true)
    setHoverIdx(null)
    fetchDailySpendAction(from, to, clientId).then((res) => {
      if (!cancelled) {
        setPoints(res.points ?? [])
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [preset, clientId])

  const data = points.map((p) => p.spendMinor)
  const labels = points.map((p) => p.date.slice(5)) // "MM-DD"
  const hasChart = data.length >= 2

  const min = hasChart ? Math.min(...data) : 0
  const max = hasChart ? Math.max(...data) : 1
  const range = max - min || 1

  const pts: [number, number][] = data.map((v, i) => [
    PADL + (i / (data.length - 1)) * cW,
    PADT + cH - ((v - min) / range) * cH,
  ])

  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const areaPath = hasChart
    ? [`M ${PADL},${PADT + cH}`, ...pts.map(([x, y]) => `L ${x},${y}`), `L ${PADL + cW},${PADT + cH}`, 'Z'].join(' ')
    : ''

  const yTicks = [min, (min + max) / 2, max]
  const midI = Math.floor((labels.length - 1) / 2)
  const xTicks = hasChart
    ? [{ i: 0, label: labels[0] }, { i: midI, label: labels[midI] }, { i: labels.length - 1, label: labels[labels.length - 1] }]
    : []

  const hovered =
    hoverIdx !== null && hoverIdx < pts.length
      ? { x: pts[hoverIdx]![0], y: pts[hoverIdx]![1], value: data[hoverIdx]!, label: labels[hoverIdx]! }
      : null

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!hasChart) return
      const rect = e.currentTarget.getBoundingClientRect()
      const scale = Math.min(rect.width / W, rect.height / H)
      const contentW = W * scale
      const offsetX = (rect.width - contentW) / 2
      const svgX = ((e.clientX - rect.left - offsetX) / contentW) * W
      const idx = Math.max(0, Math.min(data.length - 1, Math.round(((svgX - PADL) / cW) * (data.length - 1))))
      setHoverIdx(idx)
    },
    [hasChart, data.length],
  )

  const totalSpend = data.reduce((s, v) => s + v, 0)

  return (
    <div className="bg-[#111111] rounded-2xl p-5 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-3">
          <h3 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">Daily Spend</h3>
          {hovered ? (
            <span className="text-sm font-semibold text-white">
              {hovered.label}&nbsp;—&nbsp;<span style={{ color: COLOR }}>{fmtSpend(hovered.value)}</span>
            </span>
          ) : totalSpend > 0 && !loading ? (
            <span className="text-sm font-semibold" style={{ color: COLOR }}>{fmtSpend(totalSpend)} total</span>
          ) : null}
        </div>
        <div className="flex items-center gap-0.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                preset === p.id ? 'bg-[#c9a96e]/15 text-[#c9a96e]' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-[140px] flex items-center justify-center">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#c9a96e]/40 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </div>
      ) : !hasChart ? (
        <div className="h-[140px] flex items-center justify-center text-gray-700 text-xs">No spend data for this range</div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          aria-hidden="true"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
          className="cursor-crosshair"
        >
          <defs>
            <linearGradient id="dsc-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR} stopOpacity="0.18" />
              <stop offset="100%" stopColor={COLOR} stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((tick, i) => {
            const y = PADT + cH - ((tick - min) / range) * cH
            return (
              <g key={i}>
                <line x1={PADL} y1={y} x2={W - PADR} y2={y} stroke="#1f1f1f" strokeWidth="1" />
                <text x={PADL - 6} y={y} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="#374151">
                  {fmtSpend(Math.round(tick))}
                </text>
              </g>
            )
          })}

          {xTicks.map(({ i, label }) => (
            <text key={i} x={PADL + (i / (data.length - 1)) * cW} y={H - 4} textAnchor="middle" fontSize="9" fill="#374151">
              {label}
            </text>
          ))}

          <path d={areaPath} fill="url(#dsc-area)" />
          <polyline points={polyline} fill="none" stroke={COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {hovered && (
            <line
              x1={hovered.x} y1={PADT} x2={hovered.x} y2={PADT + cH}
              stroke={COLOR} strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.4"
            />
          )}

          <circle cx={pts[pts.length - 1]![0]} cy={pts[pts.length - 1]![1]} r="3" fill={COLOR} />

          {hovered && (
            <>
              <circle cx={hovered.x} cy={hovered.y} r="5" fill={COLOR} fillOpacity="0.2" />
              <circle cx={hovered.x} cy={hovered.y} r="3" fill={COLOR} />
            </>
          )}
        </svg>
      )}
    </div>
  )
}
