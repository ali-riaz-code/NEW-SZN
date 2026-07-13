'use client'
import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { logCallAction } from './actions'

const INPUT =
  'w-full bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#c9a96e]/40 transition-colors'
const LABEL = 'block text-[10px] font-semibold tracking-widest uppercase text-gray-500 mb-1.5'

const OUTCOMES: Array<{ value: string; label: string }> = [
  { value: 'CLOSED_PIF', label: 'Closed — Paid in Full' },
  { value: 'CLOSED_SPLIT_PAY', label: 'Closed — Split Pay' },
  { value: 'CLOSED_DEPOSIT', label: 'Closed — Deposit' },
  { value: 'OFFER_DECLINED', label: 'Offer Declined' },
  { value: 'NOT_A_FIT', label: 'Not a Fit' },
  { value: 'NO_SHOW', label: 'No Show' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
  { value: 'DRAG_OVER_SHOW', label: 'Drag-over Show' },
]

const OBJECTIONS = ['THINK_ABOUT_IT', 'MONEY', 'TIME', 'PARTNER', 'FEAR', 'VALUE']

const CLOSED = new Set(['CLOSED_PIF', 'CLOSED_SPLIT_PAY', 'CLOSED_DEPOSIT'])
const LOST = new Set(['OFFER_DECLINED', 'NOT_A_FIT'])

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-[#c9a96e] hover:bg-[#b8975c] disabled:opacity-50 text-black text-sm font-semibold py-3 rounded-lg transition-colors"
    >
      {pending ? 'Logging…' : 'Log Call'}
    </button>
  )
}

export function LogCallForm({ clientId }: { clientId: string }) {
  const [state, formAction] = useFormState(logCallAction, null)
  const [outcome, setOutcome] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  const showMoney = CLOSED.has(outcome)
  const showObjection = LOST.has(outcome)

  return (
    <div className="bg-[#111111] rounded-2xl p-5">
      <h3 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500 mb-4">
        Log Call
      </h3>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="clientId" value={clientId} />

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={LABEL}>Lead Name</label>
            <input name="leadName" required className={INPUT} placeholder="Jane Doe" />
          </div>
          <div>
            <label className={LABEL}>Date</label>
            <input name="date" type="date" defaultValue={today} max={today} required className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Outcome</label>
            <select
              name="outcome"
              required
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className={INPUT}
            >
              <option value="" disabled>
                Select…
              </option>
              {OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {showMoney && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Revenue ($)</label>
              <input name="revenue" type="number" min="0" step="0.01" defaultValue="0" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Cash Collected ($)</label>
              <input name="cashCollected" type="number" min="0" step="0.01" defaultValue="0" className={INPUT} />
            </div>
          </div>
        )}

        {showObjection && (
          <div>
            <label className={LABEL}>Objection</label>
            <select name="objectionType" className={INPUT} defaultValue="">
              <option value="">None</option>
              {OBJECTIONS.map((o) => (
                <option key={o} value={o}>
                  {o.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Lead Source</label>
            <input name="leadSource" className={INPUT} placeholder="Optional" />
          </div>
          <div>
            <label className={LABEL}>Phone</label>
            <input name="leadPhone" className={INPUT} placeholder="Optional" />
          </div>
        </div>

        <div>
          <label className={LABEL}>Call Summary</label>
          <textarea name="callSummary" rows={2} className={INPUT} placeholder="Optional — used for AI debrief on lost calls" />
        </div>

        {state?.error && <p className="text-red-400/80 text-xs">{state.error}</p>}
        {state?.success && <p className="text-green-400/80 text-xs">Call logged successfully.</p>}
        <SubmitButton />
      </form>
    </div>
  )
}
