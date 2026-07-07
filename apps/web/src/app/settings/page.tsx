import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { apiGet } from '@/lib/api'
import { SettingsPanel } from './settings-panel'
import type { ClientRow, UserRow } from './actions'

export default async function SettingsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/')

  const [clientsResp, usersResp] = await Promise.all([
    apiGet<{ clients: ClientRow[] }>('/api/settings/clients').catch(() => null),
    apiGet<{ users: UserRow[] }>('/api/settings/users').catch(() => null),
  ])

  return (
    <main className="min-h-screen text-white p-6 md:p-8">
      <h1 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500 mb-6">Settings</h1>
      <SettingsPanel clients={clientsResp?.clients ?? []} users={usersResp?.users ?? []} />
    </main>
  )
}
