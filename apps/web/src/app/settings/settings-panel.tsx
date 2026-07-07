'use client'
import { useState } from 'react'
import type { ClientRow, UserRow } from './actions'
import { UsersTab } from './users-tab'
import { ClientsTab } from './clients-tab'
import { GoalsTab } from './goals-tab'
import { SlackTab } from './slack-tab'
import { AiTab } from './ai-tab'
import { UsersIcon, BuildingIcon, TargetIcon, ChatBubbleIcon, BoltIcon } from '@/components/icons'

const TABS = ['Users', 'Clients', 'Goals', 'Slack', 'AI'] as const
type Tab = (typeof TABS)[number]

const TAB_ICONS: Record<Tab, React.ComponentType<{ size?: number }>> = {
  Users: UsersIcon,
  Clients: BuildingIcon,
  Goals: TargetIcon,
  Slack: ChatBubbleIcon,
  AI: BoltIcon,
}

export function SettingsPanel({ clients, users }: { clients: ClientRow[]; users: UserRow[] }) {
  const [tab, setTab] = useState<Tab>('Users')
  // Shared client selection across the per-client tabs (Goals/Slack).
  const activeClients = clients.filter((c) => c.isActive)
  const [clientId, setClientId] = useState<string>(activeClients[0]?.id ?? clients[0]?.id ?? '')

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-6 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] w-fit">
        {TABS.map((t) => {
          const active = tab === t
          const Icon = TAB_ICONS[t]
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`group relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 ease-out active:scale-[0.96] ${
                active
                  ? 'bg-[#c9a96e]/[0.12] text-[#c9a96e] shadow-[0_0_0_1px_rgba(201,169,110,0.35),0_0_14px_rgba(201,169,110,0.18)]'
                  : 'text-gray-500 hover:bg-white/[0.05] hover:text-gray-200'
              }`}
            >
              <span className="flex-shrink-0 transition-transform duration-200 ease-out group-hover:scale-110">
                <Icon size={13} />
              </span>
              {t}
            </button>
          )
        })}
      </div>

      {tab === 'Users' && <UsersTab users={users} clients={clients} />}
      {tab === 'Clients' && <ClientsTab clients={clients} />}
      {tab === 'Goals' && (
        <GoalsTab clients={clients} clientId={clientId} onClient={setClientId} />
      )}
      {tab === 'Slack' && <SlackTab />}
      {tab === 'AI' && <AiTab />}
    </div>
  )
}

// Shared small UI atoms reused across tabs.
export function ClientSelect({
  clients,
  clientId,
  onClient,
}: {
  clients: ClientRow[]
  clientId: string
  onClient: (id: string) => void
}) {
  return (
    <select
      value={clientId}
      onChange={(e) => onClient(e.target.value)}
      className="bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#c9a96e]/40"
    >
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
          {!c.isActive ? ' (archived)' : ''}
        </option>
      ))}
    </select>
  )
}

export function Banner({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (!error && !ok) return null
  return (
    <div
      className={`rounded-xl p-3 mb-3 text-sm ${
        error ? 'bg-[#2a0b0b] border border-red-500/20 text-red-300' : 'bg-[#0b2a17] border border-green-500/20 text-green-300'
      }`}
    >
      {error ?? ok}
    </div>
  )
}

export const card = 'bg-[#111111] rounded-2xl p-5'
export const input =
  'bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#c9a96e]/40'
export const btn =
  'text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#c9a96e] text-black disabled:opacity-50'
export const btnGhost =
  'text-xs px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-gray-300 hover:text-white disabled:opacity-50'
export const label = 'text-[10px] font-semibold tracking-widest uppercase text-gray-500'
