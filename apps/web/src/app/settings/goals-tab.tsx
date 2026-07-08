'use client'
import { useEffect, useState, useTransition, useCallback } from 'react'
import { fetchGoalsAction, upsertGoalAction, type ClientRow, type GoalRow } from './actions'
import { Banner, ClientSelect, card, input, btn, label } from './settings-panel'

const KPIS: Array<{ key: string; label: string; money: boolean }> = [
  { key: 'revenue', label: 'Revenue', money: true },
  { key: 'callsTaken', label: 'Calls Taken', money: false },
  { key: 'bookedCalls', label: 'Booked Calls', money: false },
]

const now = new Date()

export function GoalsTab({
  clients,
  clientId,
  onClient,
}: {
  clients: ClientRow[]
  clientId: string
  onClient: (id: string) => void
}) {
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [goals, setGoals] = useState<Record<string, GoalRow>>({})
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pending, startTransition] = useTransition()

  const client = clients.find((c) => c.id === clientId)

  const load = useCallback(() => {
    if (!clientId) return
    setLoading(true)
    fetchGoalsAction(clientId, month, year).then((res) => {
      const map: Record<string, GoalRow> = {}
      for (const g of res.goals) map[g.kpiKey] = g
      setGoals(map)
      setLoading(false)
    })
  }, [clientId, month, year])

  useEffect(() => {
    load()
  }, [load])

  function saveGoal(kpiKey: string, money: boolean, targetStr: string, green: number, amber: number) {
    setError(null)
    setOk(null)
    const numeric = targetStr.trim() === '' ? null : Number(targetStr)
    startTransition(async () => {
      const res = await upsertGoalAction({
        clientId,
        kpiKey,
        month,
        year,
        targetMinor: money ? (numeric != null ? Math.round(numeric * 100) : null) : undefined,
        targetValue: money ? undefined : numeric,
        greenPct: green,
        amberPct: amber,
      })
      if (res.error) setError(res.error)
      else {
        setOk(`Saved ${kpiKey} goal.`)
        load()
      }
    })
  }

  return (
    <div className="space-y-4">
      <Banner error={error} ok={ok} />
      <div className={card}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <ClientSelect clients={clients} clientId={clientId} onClient={onClient} />
          <select className={input} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i, 1).toLocaleString('en-US', { month: 'long' })}
              </option>
            ))}
          </select>
          <input
            type="number"
            className={`${input} w-24`}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
          <span className="text-[11px] text-gray-600">Thresholds are read from these rows — never hardcoded.</span>
        </div>

        {loading ? (
          <p className="text-xs text-gray-600 py-4">Loading…</p>
        ) : (
          <div className="space-y-2 overflow-x-auto">
            <div className="min-w-[520px] grid grid-cols-[1fr_120px_80px_80px_auto] gap-2 text-[10px] uppercase tracking-wider text-gray-500 px-1">
              <span>KPI</span>
              <span>Target {client ? `(${client.currency})` : ''}</span>
              <span>Green ≥</span>
              <span>Amber ≥</span>
              <span />
            </div>
            {KPIS.map((k) => (
              <GoalRowEditor
                key={k.key}
                kpi={k}
                existing={goals[k.key]}
                pending={pending}
                onSave={saveGoal}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GoalRowEditor({
  kpi,
  existing,
  pending,
  onSave,
}: {
  kpi: { key: string; label: string; money: boolean }
  existing?: GoalRow
  pending: boolean
  onSave: (kpiKey: string, money: boolean, target: string, green: number, amber: number) => void
}) {
  const initialTarget = existing
    ? kpi.money
      ? existing.targetMinor != null
        ? String(existing.targetMinor / 100)
        : ''
      : existing.targetValue != null
        ? String(existing.targetValue)
        : ''
    : ''
  const [target, setTarget] = useState(initialTarget)
  const [green, setGreen] = useState(existing?.greenPct ?? 75)
  const [amber, setAmber] = useState(existing?.amberPct ?? 50)

  return (
    <div className="min-w-[520px] grid grid-cols-[1fr_120px_80px_80px_auto] gap-2 items-center">
      <span className="text-sm text-gray-300">{kpi.label}</span>
      <input className={input} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="—" />
      <input
        type="number"
        className={input}
        value={green}
        min={1}
        max={100}
        onChange={(e) => setGreen(Number(e.target.value))}
      />
      <input
        type="number"
        className={input}
        value={amber}
        min={1}
        max={100}
        onChange={(e) => setAmber(Number(e.target.value))}
      />
      <button className={btn} disabled={pending} onClick={() => onSave(kpi.key, kpi.money, target, green, amber)}>
        Save
      </button>
    </div>
  )
}
