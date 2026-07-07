'use client'
import { useEffect, useState, useTransition, useCallback } from 'react'
import { fetchAiConfigAction, upsertAiConfigAction, type Dashboard } from './actions'
import { Banner, card, btn, label } from './settings-panel'

const DASHBOARDS: Array<{ key: Dashboard; label: string; hint: string }> = [
  { key: 'master', label: 'Master', hint: 'AI Insights + Next Best Action + report narrative' },
  { key: 'sales', label: 'Sales & Closing', hint: 'AI Insights + Loss Debrief + closer daily targets' },
  { key: 'ads', label: 'Ads', hint: 'AI Insights + Campaign Narrative' },
  { key: 'setter', label: 'Appointment Setting', hint: 'AI Insights + setter daily targets' },
]

export function AiTab() {
  const [tones, setTones] = useState<Record<Dashboard, string>>({ master: '', sales: '', ads: '', setter: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const load = useCallback(() => {
    setLoading(true)
    fetchAiConfigAction().then((res) => {
      const next: Record<Dashboard, string> = { master: '', sales: '', ads: '', setter: '' }
      for (const c of res.configs) next[c.dashboard] = c.tone
      setTones(next)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function save(dashboard: Dashboard) {
    setError(null)
    setOk(null)
    startTransition(async () => {
      const res = await upsertAiConfigAction({ dashboard, tone: tones[dashboard] })
      if (res.error) setError(res.error)
      else setOk(`${dashboard} personality saved.`)
    })
  }

  return (
    <div className="space-y-4">
      <Banner error={error} ok={ok} />
      <div className={card}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-[11px] text-gray-600">
            Agency-wide tone, injected into that dashboard&apos;s AI output for every client. Blank = default voice.
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-gray-600 py-4">Loading…</p>
        ) : (
          <div className="space-y-4">
            {DASHBOARDS.map((d) => (
              <div key={d.key}>
                <div className="flex items-center justify-between mb-1">
                  <h4 className={label}>
                    {d.label} <span className="text-gray-700 normal-case tracking-normal">— {d.hint}</span>
                  </h4>
                </div>
                <textarea
                  rows={2}
                  value={tones[d.key]}
                  onChange={(e) => setTones((t) => ({ ...t, [d.key]: e.target.value }))}
                  placeholder="e.g. Direct and no-nonsense, like a demanding sales manager."
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#c9a96e]/40 resize-none"
                />
                <div className="mt-1 flex justify-end">
                  <button className={btn} disabled={pending} onClick={() => save(d.key)}>
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
