import { SectionHeading } from './section-heading'
import { formatMoney } from '../lib/format'

export interface LeaderboardRow {
  closerId: string
  name: string
  calls: number
  deals: number
  closeRate: number
  showUpRate: number
  revenueMinor: number
  currency: string
}

// Shared Top Performers table — used on the Master Dashboard and embedded in
// the Closer's Sales & Closing screen (where it deliberately stays global so
// closers can see their rank against the whole team).
export function Leaderboard({
  rows,
  title = 'Closer Leaderboard',
  highlightCloserId,
}: {
  rows: LeaderboardRow[]
  title?: string
  highlightCloserId?: string
}) {
  if (rows.length === 0) return null

  return (
    <div className="bg-[#111111] rounded-2xl p-5">
      <SectionHeading>{title}</SectionHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-800">
              <th className="pb-2 text-left font-medium">Name</th>
              <th className="pb-2 text-right font-medium">Calls</th>
              <th className="pb-2 text-right font-medium">Deals</th>
              <th className="pb-2 text-right font-medium">Close %</th>
              <th className="pb-2 text-right font-medium">Show %</th>
              <th className="pb-2 text-right font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isSelf = highlightCloserId != null && row.closerId === highlightCloserId
              return (
                <tr
                  key={row.closerId}
                  className={`border-b border-gray-800/40 last:border-0 ${isSelf ? 'bg-[#c9a96e]/[0.05]' : ''}`}
                >
                  <td className="py-3 text-white font-medium whitespace-nowrap">
                    <span className={`mr-2 text-xs font-bold ${i === 0 ? 'text-[#c9a96e]' : 'text-gray-600'}`}>{i + 1}</span>
                    <span className={i === 0 ? 'text-[#c9a96e]' : ''}>{row.name}</span>
                    {isSelf && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-[#c9a96e]/70">You</span>}
                  </td>
                  <td className="py-3 text-right text-gray-400">{row.calls}</td>
                  <td className="py-3 text-right text-gray-400">{row.deals}</td>
                  <td className="py-3 text-right text-gray-400">{row.closeRate}%</td>
                  <td className="py-3 text-right text-gray-400">{row.showUpRate}%</td>
                  <td className="py-3 text-right text-white font-semibold whitespace-nowrap">
                    {formatMoney(row.revenueMinor, row.currency)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
