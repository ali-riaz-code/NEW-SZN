interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  /** Renders a bare stroke only — no fill, no end dot. For KPI cards. */
  minimal?: boolean
}

export function Sparkline({ data, width = 200, height = 44, color = '#c9a96e', minimal = false }: SparklineProps) {
  if (data.length < 2) {
    const y = height / 2
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <line x1={0} y1={y} x2={width} y2={y} stroke={color} strokeWidth="1" strokeOpacity="0.25" strokeLinecap="round" />
      </svg>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const padding = 2

  const points = data.map((v, i): [number, number] => {
    const x = (i / (data.length - 1)) * width
    const y = height - padding - ((v - min) / range) * (height - padding * 2)
    return [x, y]
  })

  const polylinePoints = points.map(([x, y]) => `${x},${y}`).join(' ')
  const [endX, endY] = points[points.length - 1] ?? [0, height / 2]

  if (minimal) {
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth="1"
          strokeOpacity="0.55"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  const first = points[0] ?? [0, height - padding]
  const last = points[points.length - 1] ?? [width, height - padding]

  const areaPath = [
    `M ${first[0]},${height}`,
    ...points.map(([x, y]) => `L ${x},${y}`),
    `L ${last[0]},${height}`,
    'Z',
  ].join(' ')

  const gradId = `sp${color.replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={endX} cy={endY} r="2.5" fill={color} />
    </svg>
  )
}
