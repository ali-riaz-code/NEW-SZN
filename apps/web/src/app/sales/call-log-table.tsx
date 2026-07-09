'use client'
import { useState, useTransition } from 'react'
import { formatMoney } from '@/lib/format'
import { tagCallAction, type LeadTagType } from '@/app/call-logs/actions'
import { reassignLeadAction } from './actions'

export interface TodayCallRow {
  id: string
  date: string
  leadName: string
  leadPhone: string | null
  leadEmail: string | null
  outcome: string
  revenueMinor: number
  currency: string
  objectionType: string | null
  objectionNotes: string | null
  callSummary: string | null
  closerName: string
  closerId: string
  currentTag: string | null
}

const TAG_OPTIONS: Array<{ value: LeadTagType; label: string }> = [
  { value: 'CLOSED', label: 'Closed' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'HOT_FOLLOW_UP', label: 'Hot follow-up' },
  { value: 'NO_SHOW', label: 'No-show' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'NOT_INTERESTED', label: 'Not interested' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
]

const OUTCOME_BADGE: Record<string, string> = {
  CLOSED_PIF: 'bg-[#0b2a17] text-[#4ade80]',
  CLOSED_SPLIT_PAY: 'bg-[#0b2a17] text-[#4ade80]',
  CLOSED_DEPOSIT: 'bg-[#0b2a17] text-[#4ade80]',
  OFFER_DECLINED: 'bg-[#2a1f0b] text-[#f59e0b]',
  NOT_A_FIT: 'bg-[#2a0b0b] text-[#f87171]',
  NO_SHOW: 'bg-white/[0.06] text-gray-400',
  CANCELLED: 'bg-white/[0.06] text-gray-400',
  RESCHEDULED: 'bg-white/[0.06] text-gray-400',
  DRAG_OVER_SHOW: 'bg-[#2a230b] text-[#c9a96e]',
}

function outcomeLabel(o: string): string {
  return o.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function nice(s: string): string {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

export function TodayCallLogTable({
  rows: initialRows,
  isAdmin,
  closers,
}: {
  rows: TodayCallRow[]
  isAdmin: boolean
  closers: Array<{ id: string; name: string }>
}) {
  const [rows, setRows] = useState(initialRows)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [tagPending, setTagPending] = useState<Set<string>>(new Set())
  const [reassignFor, setReassignFor] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
    setReassignFor(null)
  }

  function handleTagChange(id: string, prevTag: string | null, newTag: LeadTagType) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, currentTag: newTag } : r)))
    setTagPending((p) => new Set(p).add(id))
    tagCallAction(id, newTag).then((res) => {
      setTagPending((p) => {
        const n = new Set(p)
        n.delete(id)
        return n
      })
      if (res.error) {
        setError(res.error)
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, currentTag: prevTag } : r)))
      }
    })
  }

  function handleReassign(callId: string, newCloserId: string, newCloserName: string) {
    setReassignFor(null)
    startTransition(async () => {
      const res = await reassignLeadAction(callId, newCloserId)
      if (res.error) {
        setError(res.error)
        return
      }
      setRows((prev) =>
        prev.map((r) => (r.id === callId ? { ...r, closerId: newCloserId, closerName: newCloserName } : r)),
      )
    })
  }

  return (
    <div className="bg-[#111111] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">
          Today&apos;s Call Log
        </h3>
        {rows.length > 0 && (
          <span className="text-[11px] text-gray-600">{rows.length} call{rows.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {error && (
        <div className="mb-3 text-xs text-[#f87171] bg-[#2a0b0b] border border-[#f87171]/20 rounded-lg p-2">{error}</div>
      )}

      {rows.length === 0 ? (
        <div className="h-20 flex items-center justify-center text-gray-700 text-xs">No calls logged today</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-800">
                <th className="pb-2 text-left font-medium w-4" />
                <th className="pb-2 text-left font-medium">Lead</th>
                <th className="pb-2 text-left font-medium">Closer</th>
                <th className="pb-2 text-left font-medium">Outcome</th>
                <th className="pb-2 text-left font-medium">Tag</th>
                <th className="pb-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.flatMap((r) => {
                const isExpanded = expandedId === r.id
                return [
                  <tr
                    key={r.id}
                    onClick={() => toggleExpand(r.id)}
                    className="border-b border-gray-800/40 last:border-0 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-2.5 pr-1 text-gray-600 text-[10px]">{isExpanded ? '▾' : '▸'}</td>
                    <td className="py-2.5 text-white font-medium">{r.leadName}</td>
                    <td className="py-2.5 text-gray-400">{r.closerName}</td>
                    <td className="py-2.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${OUTCOME_BADGE[r.outcome] ?? 'bg-white/[0.06] text-gray-400'}`}
                      >
                        {outcomeLabel(r.outcome)}
                      </span>
                    </td>
                    <td className="py-2.5" onClick={(e) => e.stopPropagation()}>
                      <select
                        disabled={tagPending.has(r.id)}
                        value={r.currentTag ?? ''}
                        onChange={(e) => {
                          if (!e.target.value) return
                          handleTagChange(r.id, r.currentTag, e.target.value as LeadTagType)
                        }}
                        style={{ colorScheme: 'dark' }}
                        className="bg-[#1a1a1a] border border-white/[0.08] rounded px-1.5 py-1 text-white text-[11px] focus:outline-none focus:border-[#c9a96e]/40 disabled:opacity-50"
                      >
                        <option value="">— tag —</option>
                        {TAG_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 text-right text-gray-300 font-medium whitespace-nowrap">
                      {r.revenueMinor > 0 ? formatMoney(r.revenueMinor, r.currency) : '—'}
                    </td>
                  </tr>,

                  isExpanded ? (
                    <tr key={`${r.id}-expand`} className="border-b border-gray-800/40 last:border-0">
                      <td colSpan={6} className="pb-4 pt-0 px-2">
                        <div className="bg-[#0d0d0d] rounded-xl p-4 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                          {/* Contact info */}
                          <div>
                            <p className="text-[9px] font-semibold tracking-widest uppercase text-gray-600 mb-1">Contact</p>
                            {r.leadPhone && <p className="text-gray-300">{r.leadPhone}</p>}
                            {r.leadEmail && <p className="text-gray-400 mt-0.5">{r.leadEmail}</p>}
                            {!r.leadPhone && !r.leadEmail && (
                              <p className="text-gray-700">No contact info recorded</p>
                            )}
                          </div>

                          {/* Objection */}
                          <div>
                            <p className="text-[9px] font-semibold tracking-widest uppercase text-gray-600 mb-1">Objection</p>
                            {r.objectionType ? (
                              <>
                                <p className="text-gray-300">{nice(r.objectionType)}</p>
                                {r.objectionNotes && (
                                  <p className="text-gray-500 mt-0.5 leading-relaxed">{r.objectionNotes}</p>
                                )}
                              </>
                            ) : (
                              <p className="text-gray-700">—</p>
                            )}
                          </div>

                          {/* Call notes */}
                          {r.callSummary && (
                            <div className="col-span-2">
                              <p className="text-[9px] font-semibold tracking-widest uppercase text-gray-600 mb-1">Call Notes</p>
                              <p className="text-gray-400 leading-relaxed">{r.callSummary}</p>
                            </div>
                          )}

                          {/* Admin reassignment */}
                          {isAdmin && (
                            <div onClick={(e) => e.stopPropagation()} className="col-span-2">
                              <p className="text-[9px] font-semibold tracking-widest uppercase text-gray-600 mb-1">Closer</p>
                              {reassignFor === r.id ? (
                                <span className="inline-flex items-center gap-2">
                                  <select
                                    defaultValue=""
                                    autoFocus
                                    onChange={(e) => {
                                      const target = closers.find((c) => c.id === e.target.value)
                                      if (target) handleReassign(r.id, target.id, target.name)
                                    }}
                                    style={{ colorScheme: 'dark' }}
                                    className="bg-[#1a1a1a] border border-white/[0.08] rounded px-2 py-1 text-white text-[11px] focus:outline-none focus:border-[#c9a96e]/40"
                                  >
                                    <option value="">Reassign to…</option>
                                    {closers
                                      .filter((c) => c.id !== r.closerId)
                                      .map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.name}
                                        </option>
                                      ))}
                                  </select>
                                  <button
                                    onClick={() => setReassignFor(null)}
                                    className="text-[10px] text-gray-500 hover:text-gray-300 px-1"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2">
                                  <span className="text-gray-300">{r.closerName}</span>
                                  <button
                                    onClick={() => setReassignFor(r.id)}
                                    className="text-[10px] text-gray-600 hover:text-[#c9a96e] transition-colors"
                                  >
                                    · Change
                                  </button>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : null,
                ]
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
