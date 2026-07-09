'use client'
import { useState } from 'react'

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function fmtFull(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export function ActivityHeatmap({
  data,
}: {
  data: Array<{ date: string; value: number; bookedCalls: number }>
}) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (data.length === 0) return null

  // Fixed absolute scale so N booked calls always maps to the same colour,
  // regardless of what other days in the window look like.
  function bookedCallsToOpacity(calls: number): number {
    if (calls === 0) return 0
    if (calls <= 2) return 0.22
    if (calls <= 4) return 0.45
    if (calls <= 6) return 0.68
    if (calls <= 9) return 0.84
    return 0.96
  }

  // Offset so the grid starts on the correct weekday (Mon = 0)
  const firstDow = (new Date(data[0]!.date + 'T00:00:00').getDay() + 6) % 7
  const cells: (typeof data[0] | null)[] = [...Array(firstDow).fill(null), ...data]
  while (cells.length % 7 !== 0) cells.push(null)

  const hd = hovered !== null ? data[hovered] : null

  return (
    <div className="relative bg-[#111111] rounded-2xl p-5 border border-white/[0.04]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a96e]/20 to-transparent rounded-t-2xl" />

      <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-500 mb-4">
        30-Day Activity
      </p>

      {/* Day-of-week column headers */}
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {DOW.map((d, i) => (
          <div
            key={i}
            className="text-center text-[9px] font-semibold text-gray-700 uppercase tracking-widest"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} className="aspect-square" />

          const dataIdx = data.indexOf(cell)
          const isHov = hovered === dataIdx
          const opacity = bookedCallsToOpacity(cell.bookedCalls)
          const hasActivity = cell.bookedCalls > 0

          const bgColor = hasActivity
            ? `rgba(201,169,110,${opacity.toFixed(2)})`
            : 'rgba(255,255,255,0.04)'

          const dayNum = new Date(cell.date + 'T00:00:00').getDate()

          return (
            <div
              key={i}
              className="aspect-square rounded-lg flex items-center justify-center cursor-default select-none transition-transform duration-100"
              style={{
                backgroundColor: bgColor,
                transform: isHov ? 'scale(1.18)' : 'scale(1)',
                boxShadow: isHov && hasActivity
                  ? `0 0 14px rgba(201,169,110,${(opacity * 0.6).toFixed(2)})`
                  : 'none',
                zIndex: isHov ? 10 : 'auto',
                position: 'relative',
              }}
              onMouseEnter={() => setHovered(dataIdx)}
              onMouseLeave={() => setHovered(null)}
            >
              <span
                className="text-[9px] font-bold leading-none"
                style={{
                  color: opacity >= 0.68
                    ? 'rgba(0,0,0,0.65)'
                    : 'rgba(255,255,255,0.3)',
                }}
              >
                {dayNum}
              </span>
            </div>
          )
        })}
      </div>

      {/* Status bar — fixed height to prevent layout shift */}
      <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between h-8">
        {hd ? (
          <>
            <p className="text-gray-400 text-[11px]">{fmtFull(hd.date)}</p>
            <div className="flex items-center gap-3">
              {hd.bookedCalls > 0 && (
                <span className="text-[11px] text-gray-500">
                  <span className="text-[#c9a96e] font-bold">{hd.bookedCalls}</span>
                  {' '}booked
                </span>
              )}
              {hd.value > hd.bookedCalls && (
                <span className="text-[11px] text-gray-600">
                  <span className="text-gray-400 font-semibold">{hd.value}</span>
                  {' '}total activity
                </span>
              )}
              {hd.value === 0 && (
                <span className="text-gray-700 text-[11px]">No activity</span>
              )}
            </div>
          </>
        ) : (
          <p className="text-gray-700 text-[11px]">Hover a day to see details</p>
        )}
      </div>
    </div>
  )
}
