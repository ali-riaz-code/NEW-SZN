'use client'
import { useFormState, useFormStatus } from 'react-dom'
import { logDayAction } from './actions'

const INPUT =
  'w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#c9a96e]/40 transition-colors'
const LABEL = 'block text-[10px] font-semibold tracking-widest uppercase text-gray-500 mb-1.5'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-[#c9a96e] hover:bg-[#b8975c] disabled:opacity-50 text-black text-sm font-semibold py-3 rounded-lg transition-colors"
    >
      {pending ? 'Saving…' : 'Log Day'}
    </button>
  )
}

export function LogDayForm({ clientId }: { clientId: string }) {
  const [state, formAction] = useFormState(logDayAction, null)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="bg-[#111111] rounded-2xl p-5">
      <h3 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500 mb-4">
        Log Day
      </h3>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="clientId" value={clientId} />
        <div>
          <label className={LABEL}>Date</label>
          <input name="date" type="date" defaultValue={today} max={today} required className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>New Convos</label>
            <input name="newConvos" type="number" min="0" defaultValue="0" required className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Responses</label>
            <input name="responses" type="number" min="0" defaultValue="0" required className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Call Proposals</label>
            <input name="offers" type="number" min="0" defaultValue="0" required className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Calls Booked</label>
            <input name="bookedCalls" type="number" min="0" defaultValue="0" required className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Follow-ups</label>
            <input name="followUps" type="number" min="0" defaultValue="0" required className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Follower Count</label>
            <input name="followerCount" type="number" min="0" placeholder="Optional" className={INPUT} />
          </div>
        </div>
        {state?.error && (
          <p className="text-red-400/80 text-xs">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-green-400/80 text-xs">Day logged successfully.</p>
        )}
        <SubmitButton />
      </form>
    </div>
  )
}
