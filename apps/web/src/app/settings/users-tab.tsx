'use client'
import { useState, useTransition } from 'react'
import { InfoIcon } from '@/components/icons'
import {
  inviteUserAction,
  updateUserAction,
  deleteUserAction,
  type ClientRow,
  type UserRow,
  type Role,
} from './actions'
import { Banner, card, input, btn, btnGhost, label } from './settings-panel'

const ROLES: Role[] = ['ADMIN', 'CLOSER', 'SETTER', 'CLIENT']

export function UsersTab({ users, clients }: { users: UserRow[]; clients: ClientRow[] }) {
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Invite form state
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('CLOSER')
  const [inviteClients, setInviteClients] = useState<string[]>([])

  const [editId, setEditId] = useState<string | null>(null)

  function invite() {
    setError(null)
    setOk(null)
    startTransition(async () => {
      const res = await inviteUserAction({ email, name, role, clientIds: inviteClients })
      if (res.error) setError(res.error)
      else {
        setOk(`Invite sent to ${email}.`)
        setEmail('')
        setName('')
        setInviteClients([])
      }
    })
  }

  return (
    <div className="space-y-4">
      <Banner error={error} ok={ok} />

      {/* Invite */}
      <div className={card}>
        <h3 className={`${label} mb-3`}>Invite user</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${input} w-52`} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={`${input} w-40`} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className={input} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button className={btn} disabled={pending || !email || !name} onClick={invite}>
            Send invite
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {clients.map((c) => {
            const on = inviteClients.includes(c.id)
            return (
              <button
                key={c.id}
                onClick={() =>
                  setInviteClients((prev) => (on ? prev.filter((x) => x !== c.id) : [...prev, c.id]))
                }
                className={`text-[11px] px-2 py-1 rounded-lg border ${
                  on ? 'bg-[#1a2333] text-[#7dd3fc] border-[#7dd3fc]/30' : 'bg-white/[0.04] text-gray-500 border-white/[0.08]'
                }`}
              >
                {c.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Users table */}
      <div className={card}>
        <h3 className={`${label} mb-3`}>Users ({users.length})</h3>
        <div className="space-y-1.5">
          {users.map((u) => (
            <div key={u.id} className="border-b border-gray-800/40 last:border-0 pb-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                <div className="min-w-0">
                  <span className={`font-medium ${u.isActive ? 'text-white' : 'text-gray-600 line-through'}`}>
                    {u.name}
                  </span>
                  <span className="text-gray-600 text-xs ml-2">{u.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-400">{u.role}</span>
                  {u.slackUserId && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#0b2a17] text-[#4ade80] border border-[#4ade80]/30">
                      Slack ✓
                    </span>
                  )}
                  {!u.isActive && <span className="text-[10px] text-red-400/70">deactivated</span>}
                  <button className={btnGhost} onClick={() => setEditId(editId === u.id ? null : u.id)}>
                    {editId === u.id ? 'Close' : 'Edit'}
                  </button>
                </div>
              </div>
              {editId === u.id && (
                <UserEditor
                  user={u}
                  clients={clients}
                  pending={pending}
                  onSave={(patch) => {
                    setError(null)
                    setOk(null)
                    startTransition(async () => {
                      const res = await updateUserAction(u.id, patch)
                      if (res.error) setError(res.error)
                      else {
                        setOk('User updated.')
                        setEditId(null)
                      }
                    })
                  }}
                  onDelete={() => {
                    setError(null)
                    setOk(null)
                    startTransition(async () => {
                      const res = await deleteUserAction(u.id)
                      if (res.error) setError(res.error)
                      else {
                        setOk(`${u.name} removed.`)
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

function UserEditor({
  user,
  clients,
  pending,
  onSave,
  onDelete,
}: {
  user: UserRow
  clients: ClientRow[]
  pending: boolean
  onSave: (patch: Partial<{ role: Role; isActive: boolean; slackUserId: string | null; clientIds: string[] }>) => void
  onDelete: () => void
}) {
  const [role, setRole] = useState<Role>(user.role)
  const [isActive, setIsActive] = useState(user.isActive)
  const [slackUserId, setSlackUserId] = useState(user.slackUserId ?? '')
  const [clientIds, setClientIds] = useState<string[]>(user.clientIds)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <div className="bg-black/30 rounded-xl p-3 mt-1 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className={input} value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          onClick={() => setIsActive((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-lg border ${
            isActive
              ? 'bg-[#0b2a17] text-[#4ade80] border-[#4ade80]/30'
              : 'bg-[#2a0b0b] text-[#f87171] border-[#f87171]/30'
          }`}
        >
          {isActive ? 'Active' : 'Deactivated'}
        </button>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-400">Slack User ID</label>
          <div className="group relative text-gray-600 cursor-help">
            <InfoIcon size={14} />
            <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-gray-950 border border-gray-800 rounded px-2 py-1.5 text-[10px] text-gray-300 whitespace-nowrap z-10">
              Optional. Used to send DMs if email lookup fails.
              <br />
              Find in Slack: click profile → More → Copy member ID
            </div>
          </div>
        </div>
        <input
          className={input}
          placeholder="e.g. U0ABC1234XYZ"
          value={slackUserId}
          onChange={(e) => setSlackUserId(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {clients.map((c) => {
          const on = clientIds.includes(c.id)
          return (
            <button
              key={c.id}
              onClick={() => setClientIds((prev) => (on ? prev.filter((x) => x !== c.id) : [...prev, c.id]))}
              className={`text-[11px] px-2 py-1 rounded-lg border ${
                on ? 'bg-[#1a2333] text-[#7dd3fc] border-[#7dd3fc]/30' : 'bg-white/[0.04] text-gray-500 border-white/[0.08]'
              }`}
            >
              {c.name}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          className={btn}
          disabled={pending}
          onClick={() => onSave({ role, isActive, slackUserId: slackUserId || null, clientIds })}
        >
          Save changes
        </button>
        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-red-400/80">Permanently remove {user.name}?</span>
            <button
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 disabled:opacity-50"
              disabled={pending}
              onClick={onDelete}
            >
              Confirm remove
            </button>
            <button className={btnGhost} disabled={pending} onClick={() => setConfirmingDelete(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            className="text-xs px-3 py-1.5 rounded-lg text-red-400/70 border border-red-500/20 hover:bg-red-500/[0.08] hover:text-red-400 disabled:opacity-50"
            disabled={pending}
            onClick={() => setConfirmingDelete(true)}
          >
            Remove user
          </button>
        )}
      </div>
    </div>
  )
}
