'use client'
import { useState, useEffect, useTransition } from 'react'
import { syncAdsAction } from './actions'

function fmt(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SyncButton({
  initialCooldownMs,
  isAdmin,
  cooldownMs,
  lastSuccessAt,
  clientId,
}: {
  initialCooldownMs: number
  isAdmin: boolean
  cooldownMs: number
  lastSuccessAt: string | null
  clientId?: string
}) {
  const [remaining, setRemaining] = useState(initialCooldownMs)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [freshNarrative, setFreshNarrative] = useState<string | null>(null)
  // Locale-formatted timestamps differ between server (Node) and browser, causing
  // a hydration mismatch. Only render the formatted date after mount.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (remaining <= 0) return
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1000)), 1000)
    return () => clearInterval(id)
  }, [remaining])

  const onCooldown = remaining > 0
  // Permission (isAdmin) and cooldown are independent gates — never conflate them,
  // or the client-side timer reaching zero won't re-enable the button.
  const disabled = pending || onCooldown || !isAdmin

  function handleClick() {
    setError(null)
    setFreshNarrative(null)
    startTransition(async () => {
      const result = await syncAdsAction(null, clientId)
      if (result.error) {
        setError(result.error)
        if (result.cooldownRemainingMs) setRemaining(result.cooldownRemainingMs)
      } else if (result.success) {
        setRemaining(cooldownMs)
        if (result.narrative) setFreshNarrative(result.narrative)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-2 max-w-sm">
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={handleClick}
          disabled={disabled}
          className="inline-flex items-center gap-2 bg-[#c9a96e] hover:bg-[#b8975c] disabled:opacity-40 disabled:hover:bg-[#c9a96e] text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {pending ? (
            <>
              <span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Syncing…
            </>
          ) : onCooldown ? (
            `Cooldown ${fmt(remaining)}`
          ) : (
            'Sync Facebook'
          )}
        </button>

        {!isAdmin && !onCooldown && (
          <span className="text-[10px] text-gray-600">Sync is admin-only</span>
        )}
        {mounted && lastSuccessAt && !error && !freshNarrative && (
          <span className="text-[10px] text-gray-600">
            Last sync {new Date(lastSuccessAt).toLocaleString()}
          </span>
        )}
        {error && <span className="text-[10px] text-red-400/80">{error}</span>}
      </div>

      {/* AI narrative shown immediately after a successful sync */}
      {freshNarrative && (
        <div className="w-full bg-[#111111] border border-[#c9a96e]/15 rounded-xl p-3.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[#c9a96e] text-[11px]">✦</span>
            <span className="text-[9px] font-semibold tracking-widest uppercase text-gray-500">Campaign Narrative</span>
          </div>
          <p className="text-[12px] text-gray-300 leading-relaxed">{freshNarrative}</p>
        </div>
      )}
    </div>
  )
}
