'use client'
import { useState, useCallback } from 'react'

interface TrendChartProps {
  title: string
  data: number[]
  labels: (string | number)[]
  format: 'money' | 'count'
  currency?: string
  subtitle?: string
  color?: string
  /** Prefix shown before a point's label on hover (e.g. "Day "). '' for month labels. */
  pointPrefix?: string
}

function fmt(v: number, format: 'money' | 'count', currency?: string): string {
  if (format === 'count') return String(Math.round(v))
  const display = v / 100
  if (display >= 1_000_000) return `${(display / 1_000_000).toFixed(1)}M ${currency ?? ''}`.trim()
  if (display >= 1_000) return `${Math.round(display / 1_000)}K ${currency ?? ''}`.trim()
  return `${Math.round(display)} ${currency ?? ''}`.trim()
}

export function TrendChart({ title, data, labels, format, currency, subtitle, color = '#c9a96e', pointPrefix = 'Day ' }: TrendChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const W = 480
  const H = 140
  const PADL = 64
  const PADR = 16
  const PADT = 12
  const PADB = 24
  const chartW = W - PADL - PADR
  const chartH = H - PADT - PADB

  if (data.length < 2) {
    return (
      <div className="bg-[#111111] rounded-2xl p-5">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500 mb-4">{title}</h3>
        <div className="h-36 flex items-center justify-center text-gray-700 text-xs">No data yet</div>
      </div>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const pts = data.map((v, i): [number, number] => [
    PADL + (i / (data.length - 1)) * chartW,
    PADT + chartH - ((v - min) / range) * chartH,
  ])

  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const areaPath = [
    `M ${PADL},${PADT + chartH}`,
    ...pts.map(([x, y]) => `L ${x},${y}`),
    `L ${PADL + chartW},${PADT + chartH}`,
    'Z',
  ].join(' ')

  const yTicks = [min, (min + max) / 2, max]
  const midIdx = Math.floor((labels.length - 1) / 2)
  const xTicks = [
    { i: 0, label: String(labels[0]) },
    { i: midIdx, label: String(labels[midIdx]) },
    { i: labels.length - 1, label: String(labels[labels.length - 1]) },
  ]

  const hovered =
    hoverIdx !== null
      ? { x: pts[hoverIdx]![0], y: pts[hoverIdx]![1], value: data[hoverIdx]!, label: labels[hoverIdx]! }
      : null

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      // The SVG uses preserveAspectRatio="xMidYMid meet" by default.
      // When the container is wider than the viewBox aspect ratio the content
      // is centered and does NOT fill the full element width. We must subtract
      // the centering offset before converting screen → viewBox coordinates.
      const scale = Math.min(rect.width / W, rect.height / H)
      const contentW = W * scale
      const offsetX = (rect.width - contentW) / 2
      const svgX = ((e.clientX - rect.left - offsetX) / contentW) * W
      const idx = Math.max(0, Math.min(data.length - 1, Math.round(((svgX - PADL) / chartW) * (data.length - 1))))
      setHoverIdx(idx)
    },
    [data.length, chartW],
  )

  return (
    <div className="bg-[#111111] rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">{title}</h3>
        {hovered ? (
          <span className="text-sm font-semibold text-white">
            {pointPrefix}{hovered.label} —{' '}
            <span style={{ color }}>{fmt(hovered.value, format, currency)}</span>
          </span>
        ) : subtitle ? (
          <span className="text-sm font-semibold" style={{ color }}>{subtitle}</span>
        ) : null}
      </div>

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
          <linearGradient id={`tcfill-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick, idx) => {
          const y = PADT + chartH - ((tick - min) / range) * chartH
          return (
            <g key={idx}>
              <line x1={PADL} y1={y} x2={W - PADR} y2={y} stroke="#1f1f1f" strokeWidth="1" />
              <text x={PADL - 6} y={y} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="#374151">
                {fmt(Math.round(tick), format, currency)}
              </text>
            </g>
          )
        })}

        {xTicks.map(({ i, label }) => (
          <text key={i} x={PADL + (i / (data.length - 1)) * chartW} y={H - 4} textAnchor="middle" fontSize="9" fill="#374151">
            {label}
          </text>
        ))}

        <path d={areaPath} fill={`url(#tcfill-${title.replace(/\s/g, '')})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {hovered && (
          <line x1={hovered.x} y1={PADT} x2={hovered.x} y2={PADT + chartH} stroke={color} strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.4" />
        )}

        <circle cx={pts[pts.length - 1]![0]} cy={pts[pts.length - 1]![1]} r="3" fill={color} className="chart-end-dot" />

        {hovered && (
          <>
            <circle cx={hovered.x} cy={hovered.y} r="5" fill={color} fillOpacity="0.2" />
            <circle cx={hovered.x} cy={hovered.y} r="3" fill={color} />
          </>
        )}
      </svg>
    </div>
  )
}
