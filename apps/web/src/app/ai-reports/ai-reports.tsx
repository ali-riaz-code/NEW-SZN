'use client'
import { useEffect, useState, useTransition, useCallback } from 'react'
import {
  fetchReportsAction,
  generateReportAction,
  fetchScheduleAction,
  saveScheduleAction,
  type ReportRow,
  type Cadence,
  type Schedule,
} from './actions'

const CADENCES: Cadence[] = ['daily', 'weekly', 'monthly']
const SCHEDULE_OPTIONS: Array<{ value: Schedule; label: string }> = [
  { value: null,       label: 'Off' },
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]
const TYPES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const

interface ClientOption { id: string; name: string }

function Badge({ type }: { type: 'DAILY' | 'WEEKLY' | 'MONTHLY' }) {
  const styles =
    type === 'MONTHLY'
      ? 'bg-[#c9a96e]/10 text-[#c9a96e] border-[#c9a96e]/20'
      : type === 'WEEKLY'
      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      : 'bg-white/[0.05] text-gray-400 border-white/[0.08]'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${styles}`}>
      {type}
    </span>
  )
}

export function AiReports({ clients }: { clients: ClientOption[] }) {
  const firstId = clients[0]?.id ?? ''

  // ── History state — defined first so handleGenerate can reference loadHistory ─
  const PAGE_SIZE = 25
  const [histClientId, setHistClientId] = useState('')
  const [histType, setHistType] = useState('')
  const [histFrom, setHistFrom] = useState('')
  const [histTo, setHistTo] = useState('')
  const [histPage, setHistPage] = useState(1)
  const [rows, setRows] = useState<ReportRow[]>([])
  const [total, setTotal] = useState(0)
  const [histLoading, setHistLoading] = useState(false)
  const [histError, setHistError] = useState<string | null>(null)

  const loadHistory = useCallback(
    (p: number) => {
      setHistLoading(true)
      setHistError(null)
      fetchReportsAction({
        clientId: histClientId || undefined,
        type: (histType as typeof TYPES[number]) || undefined,
        from: histFrom || undefined,
        to: histTo || undefined,
        page: p,
        pageSize: PAGE_SIZE,
      }).then((res) => {
        if (res.error) setHistError(res.error)
        else if (res.data) {
          setRows(res.data.rows)
          setTotal(res.data.total)
          setHistPage(res.data.page)
        }
        setHistLoading(false)
      })
    },
    [histClientId, histType, histFrom, histTo],
  )

  useEffect(() => {
    const t = setTimeout(() => loadHistory(1), 200)
    return () => clearTimeout(t)
  }, [loadHistory])

  // ── Schedule & Generate state ─────────────────────────────────────────────
  const [schedClientId, setSchedClientId] = useState(firstId)
  const [schedule, setSchedule] = useState<Schedule>(null)
  const [pendingSchedule, setPendingSchedule] = useState<Schedule>(null)
  const [schedDirty, setSchedDirty] = useState(false)
  const [schedLoading, setSchedLoading] = useState(false)
  const [savePending, startSave] = useTransition()
  const [genPending, startGen] = useTransition()
  const [genCadence, setGenCadence] = useState<Cadence | null>(null)
  const [banner, setBanner] = useState<{ type: 'ok' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    if (!schedClientId) return
    setSchedLoading(true)
    fetchScheduleAction(schedClientId).then(({ schedule: s }) => {
      setSchedule(s)
      setPendingSchedule(s)
      setSchedDirty(false)
      setSchedLoading(false)
    })
  }, [schedClientId])

  function selectSchedule(s: Schedule) {
    setPendingSchedule(s)
    setSchedDirty(s !== schedule)
    setBanner(null)
  }

  function handleSave() {
    if (!schedClientId) return
    setBanner(null)
    startSave(async () => {
      const res = await saveScheduleAction(schedClientId, pendingSchedule)
      if (res.error) {
        setBanner({ type: 'error', msg: res.error })
      } else {
        setSchedule(pendingSchedule)
        setSchedDirty(false)
        setBanner({ type: 'ok', msg: 'Schedule saved.' })
      }
    })
  }

  function handleGenerate(cadence: Cadence) {
    if (!schedClientId) return
    setBanner(null)
    setGenCadence(cadence)
    startGen(async () => {
      const res = await generateReportAction(schedClientId, cadence)
      setGenCadence(null)
      if (res.error) {
        setBanner({ type: 'error', msg: res.error })
      } else {
        const label = cadence.charAt(0).toUpperCase() + cadence.slice(1)
        setBanner({ type: 'ok', msg: `${label} report generated — it will appear in the archive below.` })
        loadHistory(1)
      }
    })
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4">

      {/* ── Schedule & Generate card ──────────────────────────────────────── */}
      <div className="bg-[#111111] rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <h2 className="text-[11px] font-semibold tracking-widest uppercase text-gray-500 flex-1">
            Schedule &amp; Generation
          </h2>
          <select
            value={schedClientId}
            onChange={(e) => setSchedClientId(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#c9a96e]/40"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {banner && (
          <div className={`mb-4 rounded-xl px-3 py-2.5 text-xs ${
            banner.type === 'ok'
              ? 'bg-[#0d2818] border border-green-500/20 text-green-400'
              : 'bg-[#2a0b0b] border border-red-500/20 text-red-300'
          }`}>
            {banner.msg}
          </div>
        )}

        {/* Auto-schedule picker */}
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-2.5">Auto-generate schedule</p>
          {schedLoading ? (
            <p className="text-xs text-gray-700 py-1">Loading…</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.05]">
                {SCHEDULE_OPTIONS.map((opt) => {
                  const active = pendingSchedule === opt.value
                  return (
                    <button
                      key={String(opt.value)}
                      onClick={() => selectSchedule(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                        active
                          ? 'bg-[#c9a96e]/15 text-[#c9a96e] border border-[#c9a96e]/25 shadow-[0_0_10px_rgba(201,169,110,0.12)]'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              {schedDirty && (
                <button
                  disabled={savePending}
                  onClick={handleSave}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#c9a96e]/10 text-[#c9a96e] border border-[#c9a96e]/25 hover:bg-[#c9a96e]/20 transition-colors disabled:opacity-50"
                >
                  {savePending ? 'Saving…' : 'Save Schedule'}
                </button>
              )}
              {!schedDirty && schedule && (
                <span className="text-[11px] text-gray-600">
                  Auto-generates {schedule}
                </span>
              )}
              {!schedDirty && !schedule && (
                <span className="text-[11px] text-gray-700">No auto-schedule — off</span>
              )}
            </div>
          )}
        </div>

        {/* Generate now */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-2.5">Generate now</p>
          <div className="flex flex-wrap gap-2">
            {CADENCES.map((c) => {
              const isThis = genPending && genCadence === c
              return (
                <button
                  key={c}
                  disabled={genPending || !schedClientId}
                  onClick={() => handleGenerate(c)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-gray-300 border border-white/[0.08] hover:border-[#c9a96e]/30 hover:text-[#c9a96e] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isThis ? 'Generating…' : `Generate ${c}`}
                </button>
              )
            })}
          </div>
          <p className="mt-2.5 text-[10px] text-gray-700">
            AI coaching narrative included in every PDF report.
          </p>
        </div>
      </div>

      {/* ── Report Archive card ───────────────────────────────────────────── */}
      <div className="bg-[#111111] rounded-2xl p-5">
        <h2 className="text-[11px] font-semibold tracking-widest uppercase text-gray-500 mb-4">
          Report Archive
        </h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={histClientId}
            onChange={(e) => { setHistClientId(e.target.value); setHistPage(1) }}
            style={{ colorScheme: 'dark' }}
            className="bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#c9a96e]/40"
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={histType}
            onChange={(e) => { setHistType(e.target.value); setHistPage(1) }}
            style={{ colorScheme: 'dark' }}
            className="bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#c9a96e]/40"
          >
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-[11px] text-gray-500">
            From
            <input
              type="date"
              value={histFrom}
              onChange={(e) => { setHistFrom(e.target.value); setHistPage(1) }}
              className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#c9a96e]/40"
            />
          </label>
          <label className="flex items-center gap-1.5 text-[11px] text-gray-500">
            To
            <input
              type="date"
              value={histTo}
              onChange={(e) => { setHistTo(e.target.value); setHistPage(1) }}
              className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#c9a96e]/40"
            />
          </label>
        </div>

        {histError && (
          <div className="bg-[#2a0b0b] border border-red-500/20 rounded-xl p-3 mb-3 text-xs text-red-300">
            {histError}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-800">
                <th className="pb-2 text-left font-medium">Type</th>
                <th className="pb-2 text-left font-medium pl-4">Client</th>
                <th className="pb-2 text-left font-medium pl-4">Period</th>
                <th className="pb-2 text-left font-medium pl-4">Generated</th>
                <th className="pb-2 text-left font-medium pl-4">By</th>
                <th className="pb-2 text-right font-medium">Download</th>
              </tr>
            </thead>
            <tbody>
              {histLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-700 text-xs">Loading…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-700 text-xs">
                    No reports found. Use "Generate now" above to create the first one.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-800/40 last:border-0">
                    <td className="py-2.5"><Badge type={r.type} /></td>
                    <td className="py-2.5 text-gray-300 pl-4">{r.clientName}</td>
                    <td className="py-2.5 text-gray-500 pl-4 whitespace-nowrap text-xs">
                      {r.periodStart} → {r.periodEnd}
                    </td>
                    <td className="py-2.5 text-gray-500 pl-4 text-xs whitespace-nowrap">
                      {new Date(r.generatedAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 text-gray-500 pl-4 text-xs">{r.generatedBy}</td>
                    <td className="py-2.5 text-right">
                      <a
                        href={`/api/reports/${r.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-gray-400 bg-white/[0.04] border border-white/[0.08] hover:border-[#c9a96e]/30 hover:text-[#c9a96e] transition-all duration-150"
                      >
                        PDF ↓
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>{total} report{total !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={histPage <= 1 || histLoading}
              onClick={() => loadHistory(histPage - 1)}
              className="px-2 py-1 rounded bg-white/[0.05] disabled:opacity-30 hover:text-gray-300"
            >
              ← Prev
            </button>
            <span>{histPage} / {totalPages}</span>
            <button
              disabled={histPage >= totalPages || histLoading}
              onClick={() => loadHistory(histPage + 1)}
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
