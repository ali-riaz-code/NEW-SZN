'use client'
import { useEffect, useState, useTransition, useCallback } from 'react'
import { formatMoney } from '@/lib/format'
import {
  fetchCallLogsAction,
  tagCallAction,
  deleteCallAction,
  restoreCallAction,
  reassignCallAction,
  type CallLogRow,
  type CallLogFilters,
  type LeadTagType,
} from './actions'

const OUTCOMES = [
  'CLOSED_PIF',
  'CLOSED_SPLIT_PAY',
  'CLOSED_DEPOSIT',
  'OFFER_DECLINED',
  'NOT_A_FIT',
  'NO_SHOW',
  'CANCELLED',
  'RESCHEDULED',
  'DRAG_OVER_SHOW',
] as const

const TAG_OPTIONS: Array<{ value: LeadTagType; label: string }> = [
  { value: 'CLOSED', label: 'Closed' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'HOT_FOLLOW_UP', label: 'Hot follow-up' },
  { value: 'NO_SHOW', label: 'No-show' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'NOT_INTERESTED', label: 'Not interested' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
]

type Preset = 'thisMonth' | 'lastMonth' | 'last7' | 'ytd' | 'custom'

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function iso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function presetRange(p: Preset): { from?: string; to?: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  if (p === 'thisMonth') return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) }
  if (p === 'lastMonth') return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) }
  if (p === 'last7') {
    const from = new Date(now)
    from.setDate(from.getDate() - 6)
    return { from: iso(from), to: iso(now) }
  }
  if (p === 'ytd') return { from: iso(new Date(y, 0, 1)), to: iso(now) }
  return {}
}

const nice = (s: string) => s.replace(/_/g, ' ').toLowerCase()

export interface CloserOption {
  id: string
  name: string
}

export function CallLogs({
  isAdmin,
  closers,
}: {
  isAdmin: boolean
  closers: CloserOption[]
}) {
  const [rows, setRows] = useState<CallLogRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 25

  const [outcome, setOutcome] = useState('')
  const [closerId, setCloserId] = useState('')
  const [leadName, setLeadName] = useState('')
  const [leadSource, setLeadSource] = useState('')
  const [preset, setPreset] = useState<Preset>('custom')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [includeDeleted, setIncludeDeleted] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [reassignFor, setReassignFor] = useState<string | null>(null)
  const [tagPending, setTagPending] = useState<Set<string>>(new Set())

  const load = useCallback(
    (p: number) => {
      setLoading(true)
      setError(null)
      const filters: CallLogFilters = {
        page: p,
        pageSize,
        outcome: outcome || undefined,
        closerId: closerId || undefined,
        leadName: leadName.trim() || undefined,
        leadSource: leadSource.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
        includeDeleted: isAdmin && includeDeleted ? true : undefined,
      }
      fetchCallLogsAction(filters).then((res) => {
        if (res.error) setError(res.error)
        else if (res.data) {
          setRows(res.data.rows)
          setTotal(res.data.total)
          setPage(res.data.page)
        }
        setLoading(false)
      })
    },
    [outcome, closerId, leadName, leadSource, from, to, includeDeleted, isAdmin],
  )

  // Initial load + reload when filters change (debounced for text inputs).
  useEffect(() => {
    const t = setTimeout(() => load(1), 250)
    return () => clearTimeout(t)
  }, [load])

  function applyPreset(p: Preset) {
    setPreset(p)
    if (p === 'custom') return
    const { from: f, to: t } = presetRange(p)
    setFrom(f ?? '')
    setTo(t ?? '')
  }

  function mutate(fn: () => Promise<{ error?: string; ok?: boolean }>) {
    startTransition(async () => {
      const res = await fn()
      if (res.error) setError(res.error)
      else load(page)
    })
  }

  function handleTagChange(rowId: string, originalTag: LeadTagType | null, newTag: LeadTagType) {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, currentTag: newTag } : r)))
    setTagPending((prev) => new Set(prev).add(rowId))
    tagCallAction(rowId, newTag).then((res) => {
      setTagPending((prev) => { const next = new Set(prev); next.delete(rowId); return next })
      if (res.error) {
        setError(res.error)
        setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, currentTag: originalTag } : r)))
      }
    })
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div>
      {/* Filters */}
      <div className="bg-[#111111] rounded-2xl p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={leadName}
            onChange={(e) => setLeadName(e.target.value)}
            placeholder="Lead name…"
            className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#c9a96e]/40 w-36"
          />
          <input
            value={leadSource}
            onChange={(e) => setLeadSource(e.target.value)}
            placeholder="Source…"
            className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#c9a96e]/40 w-28"
          />
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#c9a96e]/40"
          >
            <option value="">All outcomes</option>
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {nice(o)}
              </option>
            ))}
          </select>
          {isAdmin && (
            <select
              value={closerId}
              onChange={(e) => setCloserId(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#c9a96e]/40"
            >
              <option value="">All closers</option>
              {closers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={preset}
            onChange={(e) => applyPreset(e.target.value as Preset)}
            style={{ colorScheme: 'dark' }}
            className="bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#c9a96e]/40"
          >
            <option value="custom">Custom range</option>
            <option value="thisMonth">This month</option>
            <option value="lastMonth">Last month</option>
            <option value="last7">Last 7 days</option>
            <option value="ytd">Year to date</option>
          </select>
          <label className="flex items-center gap-1.5 text-[11px] text-gray-500">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                setPreset('custom')
              }}
              className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#c9a96e]/40"
            />
          </label>
          <label className="flex items-center gap-1.5 text-[11px] text-gray-500">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                setPreset('custom')
              }}
              className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#c9a96e]/40"
            />
          </label>
          {isAdmin && (
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400 ml-1">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
                className="accent-[#c9a96e]"
              />
              Show deleted
            </label>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-[#2a0b0b] border border-red-500/20 rounded-xl p-3 mb-3 text-sm text-red-300">{error}</div>
      )}

      {/* Table */}
      <div className="bg-[#111111] rounded-2xl p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-800">
                <th className="pb-2 text-left font-medium">Date</th>
                <th className="pb-2 text-left font-medium">Lead</th>
                <th className="pb-2 text-left font-medium">Source</th>
                <th className="pb-2 text-left font-medium">Outcome</th>
                <th className="pb-2 pr-4 text-right font-medium">Revenue</th>
                {isAdmin && <th className="pb-2 pl-4 text-left font-medium">Closer</th>}
                <th className="pb-2 text-left font-medium">Tag</th>
                <th className="pb-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-700 text-xs">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-700 text-xs">
                    No calls match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-b border-gray-800/40 last:border-0 ${r.deleted ? 'opacity-45' : ''}`}
                  >
                    <td className="py-2.5 text-gray-400 whitespace-nowrap">{r.date}</td>
                    <td className="py-2.5 text-white">
                      <span className={r.deleted ? 'line-through' : ''}>{r.leadName}</span>
                    </td>
                    <td className="py-2.5 text-gray-500">{r.leadSource ?? '—'}</td>
                    <td className="py-2.5 text-gray-400">{nice(r.outcome)}</td>
                    <td className="py-2.5 pr-4 text-right text-gray-300">
                      {r.revenueMinor > 0 ? formatMoney(r.revenueMinor, r.currency) : '—'}
                    </td>
                    {isAdmin && <td className="py-2.5 pl-4 text-gray-400">{r.closerName}</td>}
                    <td className="py-2.5">
                      {r.deleted ? (
                        <span className="text-[10px] text-red-400/70">deleted</span>
                      ) : (
                        <select
                          disabled={tagPending.has(r.id)}
                          value={r.currentTag ?? ''}
                          onChange={(e) => {
                            if (!e.target.value) return
                            handleTagChange(r.id, r.currentTag, e.target.value as LeadTagType)
                          }}
                          style={{ colorScheme: 'dark' }}
                          className="bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-2 py-1 text-white text-[11px] focus:outline-none focus:border-[#c9a96e]/40 disabled:opacity-50"
                        >
                          <option value="">— tag —</option>
                          {TAG_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      {isAdmin ? (
                        reassignFor === r.id ? (
                          <span className="inline-flex items-center gap-1">
                            <select
                              disabled={pending}
                              defaultValue=""
                              onChange={(e) =>
                                e.target.value &&
                                mutate(async () => {
                                  const res = await reassignCallAction(r.id, e.target.value)
                                  setReassignFor(null)
                                  return res
                                })
                              }
                              style={{ colorScheme: 'dark' }}
                              className="bg-[#1a1a1a] border border-white/[0.08] rounded px-1.5 py-1 text-white text-[11px] focus:outline-none"
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
                            <button onClick={() => setReassignFor(null)} className="text-[10px] text-gray-500 px-1">
                              ✕
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            {!r.deleted && (
                              <button
                                onClick={() => setReassignFor(r.id)}
                                className="text-[10px] text-gray-500 hover:text-[#c9a96e]"
                              >
                                Reassign
                              </button>
                            )}
                            {r.deleted ? (
                              <button
                                disabled={pending}
                                onClick={() => mutate(() => restoreCallAction(r.id))}
                                className="text-[10px] text-gray-500 hover:text-[#4ade80] disabled:opacity-50"
                              >
                                Restore
                              </button>
                            ) : (
                              <button
                                disabled={pending}
                                onClick={() => {
                                  if (confirm(`Delete the call for ${r.leadName}? It can be restored later.`))
                                    mutate(() => deleteCallAction(r.id))
                                }}
                                className="text-[10px] text-gray-500 hover:text-red-400 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            )}
                          </span>
                        )
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>{total} calls</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => load(page - 1)}
              className="px-2 py-1 rounded bg-white/[0.05] disabled:opacity-30 hover:text-gray-300"
            >
              ← Prev
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => load(page + 1)}
              className="px-2 py-1 rounded bg-white/[0.05] disabled:opacity-30 hover:text-gray-300"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
