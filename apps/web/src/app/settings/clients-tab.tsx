'use client'
import { useState, useTransition } from 'react'
import { createClientAction, updateClientAction, type ClientRow } from './actions'
import { Banner, card, input, btn, btnGhost, label } from './settings-panel'

// ISO 4217 codes for the currencies agency clients actually bill in.
const CURRENCIES = ['USD', 'EUR', 'GBP', 'DKK', 'SEK', 'NOK', 'CHF', 'CAD', 'AUD', 'NZD', 'PLN', 'ISK'] as const

function CurrencySelect({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className ?? input}>
      {!CURRENCIES.includes(value as (typeof CURRENCIES)[number]) && value && (
        <option value={value}>{value}</option>
      )}
      {CURRENCIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  )
}

export function ClientsTab({ clients }: { clients: ClientRow[] }) {
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [editId, setEditId] = useState<string | null>(null)

  // Create form
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('DKK')
  const [metaAdAccountId, setMetaAdAccountId] = useState('')

  function create() {
    setError(null)
    setOk(null)
    startTransition(async () => {
      const res = await createClientAction({ name, currency, metaAdAccountId: metaAdAccountId || null })
      if (res.error) setError(res.error)
      else {
        setOk(`Client "${name}" created.`)
        setName('')
        setMetaAdAccountId('')
      }
    })
  }

  return (
    <div className="space-y-4">
      <Banner error={error} ok={ok} />

      <div className={card}>
        <h3 className={`${label} mb-3`}>Create client</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${input} w-48`} placeholder="Client name" value={name} onChange={(e) => setName(e.target.value)} />
          <CurrencySelect value={currency} onChange={setCurrency} className={`${input} w-24`} />
          <input
            className={`${input} w-44`}
            placeholder="Meta ad account (act_…)"
            value={metaAdAccountId}
            onChange={(e) => setMetaAdAccountId(e.target.value)}
          />
          <button className={btn} disabled={pending || !name || currency.length !== 3} onClick={create}>
            Create
          </button>
        </div>
      </div>

      <div className={card}>
        <h3 className={`${label} mb-3`}>Clients ({clients.length})</h3>
        <div className="space-y-1.5">
          {clients.map((c) => (
            <div key={c.id} className="border-b border-gray-800/40 last:border-0 pb-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                <div>
                  <span className={`font-medium ${c.isActive ? 'text-white' : 'text-gray-600'}`}>{c.name}</span>
                  <span className="text-gray-600 text-xs ml-2">
                    {c.currency} · {c.metaAdAccountId ? 'ad-linked' : 'no ad account'} · anomaly {c.anomalyWarningPct}/
                    {c.anomalyCriticalPct}%
                  </span>
                  {!c.isActive && <span className="text-[10px] text-amber-400/70 ml-2">archived</span>}
                </div>
                <button className={btnGhost} onClick={() => setEditId(editId === c.id ? null : c.id)}>
                  {editId === c.id ? 'Close' : 'Edit'}
                </button>
              </div>
              {editId === c.id && (
                <ClientEditor
                  client={c}
                  pending={pending}
                  onSave={(patch) => {
                    setError(null)
                    setOk(null)
                    startTransition(async () => {
                      const res = await updateClientAction(c.id, patch)
                      if (res.error) setError(res.error)
                      else {
                        setOk('Client updated.')
                        setEditId(null)
                      }
                    })
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ClientEditor({
  client,
  pending,
  onSave,
}: {
  client: ClientRow
  pending: boolean
  onSave: (patch: Partial<ClientRow>) => void
}) {
  const [name, setName] = useState(client.name)
  const [currency, setCurrency] = useState(client.currency)
  const [timezone, setTimezone] = useState(client.timezone)
  const [metaAdAccountId, setMetaAdAccountId] = useState(client.metaAdAccountId ?? '')
  const [isActive, setIsActive] = useState(client.isActive)
  const [warn, setWarn] = useState(client.anomalyWarningPct)
  const [crit, setCrit] = useState(client.anomalyCriticalPct)
  const [closeRateWarn, setCloseRateWarn] = useState(client.closeRateAnomalyWarningPct)
  const [closeRateCrit, setCloseRateCrit] = useState(client.closeRateAnomalyCriticalPct)
  const [bigDealMajor, setBigDealMajor] = useState(String(client.bigDealThresholdMinor / 100))

  return (
    <div className="bg-black/30 rounded-xl p-3 mt-1 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${input} w-44`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <CurrencySelect value={currency} onChange={setCurrency} className={`${input} w-24`} />
        <input className={`${input} w-44`} value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Timezone" />
        <button
          onClick={() => setIsActive((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-lg border ${
            isActive ? 'bg-[#0b2a17] text-[#4ade80] border-[#4ade80]/30' : 'bg-[#2a1f0b] text-amber-400 border-amber-400/30'
          }`}
        >
          {isActive ? 'Active' : 'Archived'}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${input} w-56`}
          value={metaAdAccountId}
          onChange={(e) => setMetaAdAccountId(e.target.value)}
          placeholder="Meta ad account id (act_…)"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[11px] text-gray-400 flex items-center gap-1.5">
          Anomaly warning %
          <input
            type="number"
            min={1}
            max={99}
            className={`${input} w-16`}
            value={warn}
            onChange={(e) => setWarn(Number(e.target.value))}
          />
        </label>
        <label className="text-[11px] text-gray-400 flex items-center gap-1.5">
          Critical %
          <input
            type="number"
            min={1}
            max={99}
            className={`${input} w-16`}
            value={crit}
            onChange={(e) => setCrit(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[11px] text-gray-400 flex items-center gap-1.5">
          Close rate warning %
          <input
            type="number"
            min={1}
            max={99}
            className={`${input} w-16`}
            value={closeRateWarn}
            onChange={(e) => setCloseRateWarn(Number(e.target.value))}
          />
        </label>
        <label className="text-[11px] text-gray-400 flex items-center gap-1.5">
          Close rate critical %
          <input
            type="number"
            min={1}
            max={99}
            className={`${input} w-16`}
            value={closeRateCrit}
            onChange={(e) => setCloseRateCrit(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[11px] text-gray-400 flex items-center gap-1.5">
          Big-deal threshold ({currency})
          <input
            type="number"
            className={`${input} w-28`}
            value={bigDealMajor}
            onChange={(e) => setBigDealMajor(e.target.value)}
          />
        </label>
      </div>
      <button
        className={btn}
        disabled={pending}
        onClick={() =>
          onSave({
            name,
            currency,
            timezone,
            metaAdAccountId: metaAdAccountId || null,
            isActive,
            anomalyWarningPct: warn,
            anomalyCriticalPct: crit,
            closeRateAnomalyWarningPct: closeRateWarn,
            closeRateAnomalyCriticalPct: closeRateCrit,
            bigDealThresholdMinor: Math.round(Number(bigDealMajor || '0') * 100),
          })
        }
      >
        Save changes
      </button>
    </div>
  )
}
