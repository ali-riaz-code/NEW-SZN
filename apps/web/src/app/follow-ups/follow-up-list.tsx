'use client'
import { useState, useTransition } from 'react'
import { formatMoney } from '@/lib/format'
import { retagLeadAction, type LeadTagType } from './actions'

export interface FollowUpRow {
  id: string
  date: string
  leadName: string
  leadPhone: string | null
  leadEmail: string | null
  leadSource: string | null
  outcome: string
  revenueMinor: number
  currency: string
  followUpNotes: string | null
  closerName: string
  currentTag: LeadTagType
  taggedAt: string
}

const TAG_OPTIONS: Array<{ value: LeadTagType; label: string }> = [
  { value: 'HOT_FOLLOW_UP', label: 'Hot follow-up' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'NOT_INTERESTED', label: 'Not interested' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'NO_SHOW', label: 'No-show' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
]

function TagBadge({ tag }: { tag: LeadTagType }) {
  const hot = tag === 'HOT_FOLLOW_UP'
  return (
    <span
      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
        hot ? 'bg-[#2a0b0b] text-[#f87171]' : 'bg-[#1a2333] text-[#7dd3fc]'
      }`}
    >
      {hot ? 'HOT' : 'FOLLOW-UP'}
    </span>
  )
}

export function FollowUpList({ rows, showCloser }: { rows: FollowUpRow[]; showCloser: boolean }) {
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function retag(id: string, tag: LeadTagType) {
    setBusyId(id)
    setError(null)
    startTransition(async () => {
      const res = await retagLeadAction(id, tag)
      if (res.error) setError(res.error)
      setBusyId(null)
    })
  }

  if (rows.length === 0) {
    return (
      <div className="bg-[#111111] rounded-2xl p-10 text-center text-gray-600 text-sm">
        No open follow-ups. Tag a call as <span className="text-[#7dd3fc]">follow-up</span> or{' '}
        <span className="text-[#f87171]">hot follow-up</span> in Call Logs to add it here.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-[#2a0b0b] border border-red-500/20 rounded-xl p-3 text-sm text-red-300">{error}</div>
      )}
      {rows.map((r) => (
        <div key={r.id} className="bg-[#111111] rounded-2xl p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <TagBadge tag={r.currentTag} />
                <span className="font-semibold text-white truncate">{r.leadName}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                <span>{r.date}</span>
                {r.leadSource && <span>· {r.leadSource}</span>}
                {r.leadPhone && <span>· {r.leadPhone}</span>}
                {r.leadEmail && <span className="truncate max-w-[200px]">· {r.leadEmail}</span>}
                {showCloser && <span>· {r.closerName}</span>}
                {r.revenueMinor > 0 && <span>· {formatMoney(r.revenueMinor, r.currency)}</span>}
              </div>
              {r.followUpNotes && <p className="mt-2 text-xs text-gray-400 leading-relaxed">{r.followUpNotes}</p>}
            </div>
            <select
              disabled={pending && busyId === r.id}
              value={r.currentTag}
              onChange={(e) => retag(r.id, e.target.value as LeadTagType)}
              className="bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#c9a96e]/40 disabled:opacity-50"
            >
              {TAG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  )
}
