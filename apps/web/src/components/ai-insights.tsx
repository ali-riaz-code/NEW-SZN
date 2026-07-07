'use client'
import { useState, useTransition } from 'react'
import { getInsightsAction } from '@/app/ai-actions'

type Dashboard = 'master' | 'sales' | 'ads' | 'setter'

// On-demand AI Insights (Phase 10 #1): button → 4–6 inline observations.
export function AiInsights({ dashboard, clientId }: { dashboard: Dashboard; clientId?: string }) {
  const [pending, startTransition] = useTransition()
  const [items, setItems] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await getInsightsAction(dashboard, clientId)
        if (res.error) setError(res.error)
        else setItems(res.items ?? [])
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <div className="bg-[#111111] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">
          AI Insights
        </h3>
        <button
          onClick={handleClick}
          disabled={pending}
          className="inline-flex items-center gap-2 bg-[#c9a96e] hover:bg-[#d4b57d] active:bg-[#b8975c] disabled:opacity-40 text-[#0a0a0a] text-xs font-semibold px-4 py-2 rounded-lg transition-all duration-150 ease-out hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(201,169,110,0.35)] active:translate-y-0 active:shadow-none"
        >
          {pending ? 'Analyzing…' : items ? 'Refresh' : 'Get AI Insights'}
        </button>
      </div>

      {error && <p className="text-[11px] text-red-400/80">{error}</p>}

      {!error && items && items.length === 0 && (
        <p className="text-[11px] text-gray-600">No insights available for this period.</p>
      )}

      {!error && items && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((obs, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-300">
              <span className="text-[#c9a96e]">•</span>
              <span>{obs}</span>
            </li>
          ))}
        </ul>
      )}

      {!items && !error && !pending && (
        <p className="text-[11px] text-gray-600">
          Generate {dashboard} observations from this period&apos;s metrics.
        </p>
      )}
    </div>
  )
}
