'use client'
import { useRef, useState, useCallback, memo } from 'react'

const W = 600
const H = 180
const PADL = 32
const PADR = 12
const PADT = 16
const PADB = 32
const chartW = W - PADL - PADR
const chartH = H - PADT - PADB

function smoothPath(points: [number, number][]): string {
  if (points.length < 2) return `M ${points[0]?.[0] ?? 0},${points[0]?.[1] ?? 0}`
  const tension = 0.35
  const d: string[] = [`M ${points[0]![0]},${points[0]![1]}`]
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[Math.min(points.length - 1, i + 2)]!
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension
    d.push(`C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0]},${p2[1]}`)
  }
  return d.join(' ')
}

function fmt(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const BookingTrendChart = memo(function BookingTrendChart({ data }: { data: Array<{ date: string; bookedCalls: number }> }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current
      if (!svg) return
      // Use the SVG coordinate transform matrix so letterboxing / scaling
      // from preserveAspectRatio is handled automatically.
      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY
      const ctm = svg.getScreenCTM()
      if (!ctm) return
      const { x: svgX } = pt.matrixTransform(ctm.inverse())
      const raw = Math.round(((svgX - PADL) / chartW) * (data.length - 1))
      setHoverIdx(Math.max(0, Math.min(data.length - 1, raw)))
    },
    [data.length],
  )

  if (data.length < 2) {
    return (
      <div className="bg-[#111111] rounded-2xl p-5 border border-white/[0.04]">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-500 mb-3">Booking Trend — 30 Days</p>
        <div className="h-32 flex items-center justify-center text-gray-700 text-xs">No data yet</div>
      </div>
    )
  }

  const vals = data.map((d) => d.bookedCalls)
  const max = Math.max(...vals, 1)
  const min = Math.min(...vals)
  const range = max - min || 1

  const points: [number, number][] = data.map((d, i) => [
    PADL + (i / (data.length - 1)) * chartW,
    PADT + chartH - ((d.bookedCalls - min) / range) * chartH,
  ])

  const line = smoothPath(points)
  const bottomY = PADT + chartH
  const area = `${line} L ${points[points.length - 1]![0]},${bottomY} L ${points[0]![0]},${bottomY} Z`

  const hp = hoverIdx !== null ? points[hoverIdx] : null
  const hd = hoverIdx !== null ? data[hoverIdx] : null

  const gridYs = [0, 0.33, 0.66, 1].map((f) => ({
    y: PADT + f * chartH,
    v: Math.round(max - f * (max - min)),
  }))

  const xLabels = [0, Math.floor((data.length - 1) / 2), data.length - 1]

  return (
    <div className="relative bg-[#111111] rounded-2xl p-5 border border-white/[0.04]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a96e]/20 to-transparent rounded-t-2xl" />

      <div className="flex items-start justify-between mb-4">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">Booking Trend — 30 Days</p>
        <div className="text-right min-w-[64px]">
          {hd ? (
            <>
              <p className="text-white text-sm font-bold leading-none">{hd.bookedCalls}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">{fmt(hd.date)}</p>
            </>
          ) : (
            <p className="text-gray-700 text-[10px]">Hover to inspect</p>
          )}
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        className="cursor-crosshair overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="bt-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9a96e" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#c9a96e" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* grid lines */}
        {gridYs.map(({ y }, i) => (
          <line key={i} x1={PADL} y1={y} x2={W - PADR} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}

        {/* y-axis labels */}
        {gridYs.map(({ y, v }, i) => (
          <text key={i} x={PADL - 6} y={y} textAnchor="end" dominantBaseline="middle" fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="inherit">
            {v}
          </text>
        ))}

        {/* x-axis labels */}
        {xLabels.map((idx) => {
          const [x] = points[idx] ?? [0, 0]
          const anchor = idx === 0 ? 'start' : idx === data.length - 1 ? 'end' : 'middle'
          return (
            <text key={idx} x={x} y={H - 2} textAnchor={anchor} fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="inherit">
              {fmt(data[idx]!.date)}
            </text>
          )
        })}

        {/* area */}
        <path d={area} fill="url(#bt-fill)" />

        {/* line */}
        <path d={line} fill="none" stroke="#c9a96e" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />

        {/* baseline dots for each point — very small */}
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.5" fill="#c9a96e" opacity="0.35" />
        ))}
        {/* end dot — pulses to signal live data */}
        <circle cx={points[points.length - 1]![0]} cy={points[points.length - 1]![1]} r="3" fill="#c9a96e" className="chart-end-dot" />

        {/* hover cursor + highlight */}
        {hp && (
          <>
            <line x1={hp[0]} y1={PADT} x2={hp[0]} y2={bottomY} stroke="#c9a96e" strokeWidth="1" strokeOpacity="0.35" strokeDasharray="3 3" />
            <circle cx={hp[0]} cy={hp[1]} r="5" fill="#0f0f0f" stroke="#c9a96e" strokeWidth="2" />
            <circle cx={hp[0]} cy={hp[1]} r="2.5" fill="#c9a96e" />
          </>
        )}
      </svg>
    </div>
  )
})
