'use client'
import { useState, useMemo, useEffect, useTransition, useRef } from 'react'
import { flagCampaignAction, updateCampaignTypeAction } from './actions'

export interface CampaignRow {
  id: string
  name: string
  adType: 'TYPEFORM' | 'NORMAL'
  status: string
  flaggedForReview: boolean
  flagReason: string | null
  spendMinor: number
  impressions: number
  clicks: number
  results: number
  reach: number
  ctr: number
  costPerLeadMinor: number
  currency: string
}

const CURRENCY_PREFIX: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' }
function money(minor: number, currency: string): string {
  const major = minor / 100
  const p = CURRENCY_PREFIX[currency]
  const n = major.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return p ? `${p}${n}` : `${n} kr.`
}

type SortKey = 'name' | 'spendMinor' | 'impressions' | 'clicks' | 'results' | 'ctr' | 'costPerLeadMinor'
type StatusFilter = 'ALL' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
type TypeFilter = 'ALL' | 'TYPEFORM' | 'NORMAL'
type ColId = 'spend' | 'impressions' | 'clicks' | 'ctr' | 'results' | 'costPerLead' | 'reach'

interface ColDef {
  id: ColId
  sortKey: SortKey | null
  label: string
  defaultVisible: boolean
  render: (r: CampaignRow) => React.ReactNode
}

const COLUMNS: ColDef[] = [
  { id: 'spend',       sortKey: 'spendMinor',       label: 'Spend',      defaultVisible: true,  render: (r) => money(r.spendMinor, r.currency) },
  { id: 'impressions', sortKey: 'impressions',       label: 'Impr.',      defaultVisible: true,  render: (r) => r.impressions.toLocaleString() },
  { id: 'clicks',      sortKey: 'clicks',            label: 'Clicks',     defaultVisible: true,  render: (r) => r.clicks.toLocaleString() },
  { id: 'ctr',         sortKey: 'ctr',               label: 'CTR',        defaultVisible: true,  render: (r) => `${r.ctr.toFixed(2)}%` },
  { id: 'results',     sortKey: 'results',           label: 'Leads',      defaultVisible: true,  render: (r) => r.results.toLocaleString() },
  { id: 'costPerLead', sortKey: 'costPerLeadMinor',  label: 'Cost/Lead',  defaultVisible: true,  render: (r) => r.results > 0 ? money(r.costPerLeadMinor, r.currency) : '—' },
  { id: 'reach',       sortKey: null,                label: 'Reach',      defaultVisible: false, render: (r) => r.reach.toLocaleString() },
]

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:   'bg-[#0b2a17] text-[#4ade80]',
  PAUSED:   'bg-[#1a1206] text-[#c9a96e]',
  ARCHIVED: 'bg-white/[0.06] text-gray-500',
}

export function CampaignTable({ rows, canFlag }: { rows: CampaignRow[]; canFlag: boolean }) {
  const [localRows, setLocalRows] = useState<CampaignRow[]>(rows)
  const [sortKey, setSortKey] = useState<SortKey>('spendMinor')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [flagEditor, setFlagEditor] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [visibleCols, setVisibleCols] = useState<Set<ColId>>(
    new Set(COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id)),
  )
  const [colsOpen, setColsOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const colsRef = useRef<HTMLDivElement>(null)

  // Sync local rows when the server re-renders after revalidatePath
  useEffect(() => { setLocalRows(rows) }, [rows])

  // Close column picker when clicking outside
  useEffect(() => {
    if (!colsOpen) return
    function handler(e: MouseEvent) {
      if (colsRef.current && !colsRef.current.contains(e.target as Node)) setColsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [colsOpen])

  const statusCounts = useMemo(() => ({
    ACTIVE:   rows.filter((r) => r.status.toUpperCase() === 'ACTIVE').length,
    PAUSED:   rows.filter((r) => r.status.toUpperCase() === 'PAUSED').length,
    ARCHIVED: rows.filter((r) => r.status.toUpperCase() === 'ARCHIVED').length,
  }), [rows])

  const filtered = useMemo(() => {
    let r = localRows
    if (typeFilter !== 'ALL') r = r.filter((x) => x.adType === typeFilter)
    if (statusFilter !== 'ALL') r = r.filter((x) => x.status.toUpperCase() === statusFilter)
    if (flaggedOnly) r = r.filter((x) => x.flaggedForReview)
    if (search.trim()) r = r.filter((x) => x.name.toLowerCase().includes(search.trim().toLowerCase()))
    return [...r].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [localRows, typeFilter, statusFilter, flaggedOnly, search, sortKey, sortDir])

  const visibleColumns = COLUMNS.filter((c) => visibleCols.has(c.id))
  // name + type + status + visible data cols + flag col
  const totalCols = 3 + visibleColumns.length + (canFlag ? 1 : 0)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : 'desc') }
  }

  function submitFlag(id: string, flagged: boolean) {
    startTransition(async () => {
      await flagCampaignAction(id, flagged, flagged ? reason : '')
      setFlagEditor(null)
      setReason('')
    })
  }

  function handleTypeChange(id: string, adType: 'TYPEFORM' | 'NORMAL') {
    // Optimistic update
    setLocalRows((prev) => prev.map((r) => (r.id === id ? { ...r, adType } : r)))
    startTransition(async () => {
      const res = await updateCampaignTypeAction(id, adType)
      if (res.error) {
        // Revert to server state on failure
        setLocalRows(rows)
      }
    })
  }

  return (
    <div className="bg-[#111111] rounded-2xl p-5">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">Campaigns</h3>
        <div ref={colsRef} className="relative">
          <button
            onClick={() => setColsOpen((o) => !o)}
            className="text-[10px] font-semibold px-3 py-1.5 rounded-lg border bg-white/[0.05] text-gray-400 border-white/[0.08] hover:text-gray-200 transition-colors"
          >
            Columns ▾
          </button>
          {colsOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-20 bg-[#181818] border border-white/[0.1] rounded-xl p-2 min-w-[148px] shadow-2xl">
              {COLUMNS.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.05] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={visibleCols.has(c.id)}
                    onChange={() =>
                      setVisibleCols((prev) => {
                        const next = new Set(prev)
                        next.has(c.id) ? next.delete(c.id) : next.add(c.id)
                        return next
                      })
                    }
                    className="accent-[#c9a96e] w-3 h-3"
                  />
                  <span className="text-[11px] text-gray-300">{c.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#c9a96e]/40 w-32"
        />

        {/* Status filter — segmented control */}
        <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
          {(['ALL', 'ACTIVE', 'PAUSED', 'ARCHIVED'] as const).map((s) => {
            const active = statusFilter === s
            const count = s !== 'ALL' ? statusCounts[s] : null
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-[10px] font-semibold px-2.5 py-1.5 transition-colors border-r border-white/[0.08] last:border-r-0 ${
                  active
                    ? s === 'ACTIVE'
                      ? 'bg-[#0b2a17] text-[#4ade80]'
                      : s === 'PAUSED'
                      ? 'bg-[#1a1206] text-[#c9a96e]'
                      : s === 'ARCHIVED'
                      ? 'bg-white/[0.06] text-gray-400'
                      : 'bg-white/[0.06] text-white'
                    : 'text-gray-500 hover:text-gray-300 bg-transparent'
                }`}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                {count !== null && count > 0 && (
                  <span className="ml-1 opacity-60">({count})</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#c9a96e]/40"
        >
          <option value="ALL">All types</option>
          <option value="TYPEFORM">Typeform</option>
          <option value="NORMAL">Normal</option>
        </select>

        {/* Flagged toggle */}
        <button
          onClick={() => setFlaggedOnly((f) => !f)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            flaggedOnly
              ? 'bg-[#2a1f0b] text-[#f59e0b] border-[#f59e0b]/30'
              : 'bg-white/[0.05] text-gray-400 border-white/[0.08]'
          }`}
        >
          Flagged
        </button>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-800">
              <th
                onClick={() => toggleSort('name')}
                className="pb-2 font-medium cursor-pointer select-none hover:text-gray-300 text-left pr-3"
              >
                Campaign{sortKey === 'name' && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="pb-2 font-medium text-left pr-3">Type</th>
              <th className="pb-2 font-medium text-left pr-3">Status</th>
              {visibleColumns.map((c) => (
                <th
                  key={c.id}
                  onClick={() => c.sortKey && toggleSort(c.sortKey)}
                  className={`pb-2 font-medium text-right ${c.sortKey ? 'cursor-pointer select-none hover:text-gray-300' : ''}`}
                >
                  {c.label}
                  {c.sortKey && sortKey === c.sortKey && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
              ))}
              {canFlag && <th className="pb-2 text-right font-medium">Flag</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={totalCols} className="py-6 text-center text-gray-700 text-xs">
                  {rows.length === 0
                    ? 'No campaigns yet — run a sync to pull data.'
                    : 'No campaigns match.'}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-800/40 last:border-0 group">
                  {/* Name */}
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[160px] text-white" title={r.name}>{r.name}</span>
                      {r.flaggedForReview && (
                        <span className="text-[#f59e0b] shrink-0" title={r.flagReason ?? 'Flagged'}>⚑</span>
                      )}
                    </div>
                  </td>

                  {/* Ad type — editable dropdown for admins, static badge otherwise */}
                  <td className="py-2.5 pr-3">
                    {canFlag ? (
                      <select
                        value={r.adType}
                        disabled={pending}
                        onChange={(e) => handleTypeChange(r.id, e.target.value as 'TYPEFORM' | 'NORMAL')}
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded cursor-pointer border-0 outline-none appearance-none disabled:opacity-50 ${
                          r.adType === 'TYPEFORM' ? 'bg-[#1a2333] text-[#7dd3fc]' : 'bg-white/[0.06] text-gray-400'
                        }`}
                      >
                        <option value="TYPEFORM">Typeform</option>
                        <option value="NORMAL">Normal</option>
                      </select>
                    ) : (
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                          r.adType === 'TYPEFORM' ? 'bg-[#1a2333] text-[#7dd3fc]' : 'bg-white/[0.06] text-gray-400'
                        }`}
                      >
                        {r.adType === 'TYPEFORM' ? 'TF' : 'N'}
                      </span>
                    )}
                  </td>

                  {/* Status badge */}
                  <td className="py-2.5 pr-3">
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                        STATUS_STYLES[r.status.toUpperCase()] ?? 'bg-white/[0.06] text-gray-500'
                      }`}
                    >
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1).toLowerCase()}
                    </span>
                  </td>

                  {/* Dynamic data columns */}
                  {visibleColumns.map((c) => (
                    <td
                      key={c.id}
                      className={`py-2.5 text-right ${
                        c.id === 'spend' || c.id === 'costPerLead' ? 'text-gray-300' : 'text-gray-400'
                      }`}
                    >
                      {c.render(r)}
                    </td>
                  ))}

                  {/* Flag controls */}
                  {canFlag && (
                    <td className="py-2.5 text-right">
                      {flagEditor === r.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason…"
                            className="bg-white/[0.05] border border-white/[0.08] rounded px-2 py-1 text-white text-[11px] w-28 focus:outline-none focus:border-[#c9a96e]/40"
                          />
                          <button
                            disabled={pending}
                            onClick={() => submitFlag(r.id, true)}
                            className="text-[10px] bg-[#f59e0b] text-black px-2 py-1 rounded font-semibold disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button onClick={() => setFlagEditor(null)} className="text-[10px] text-gray-500 px-1 hover:text-gray-300">
                            ✕
                          </button>
                        </div>
                      ) : r.flaggedForReview ? (
                        <button
                          disabled={pending}
                          onClick={() => submitFlag(r.id, false)}
                          className="text-[10px] text-gray-500 hover:text-gray-300 disabled:opacity-50"
                        >
                          Unflag
                        </button>
                      ) : (
                        <button
                          onClick={() => { setFlagEditor(r.id); setReason('') }}
                          className="text-[10px] text-gray-600 hover:text-[#f59e0b] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Flag
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <p className="mt-3 text-[10px] text-gray-700 text-right">
          {filtered.length} of {rows.length} campaign{rows.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
