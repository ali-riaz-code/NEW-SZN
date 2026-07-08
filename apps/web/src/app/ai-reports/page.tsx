import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { apiGet } from '@/lib/api'
import { AiReports } from './ai-reports'

interface ClientsResp {
  clients: Array<{ id: string; name: string; isActive: boolean }>
}

export default async function AiReportsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const role = session.user.role
  // Admins manage generation/schedules; clients get a read-only archive of
  // reports generated for their own business (the API enforces the scoping).
  if (role !== 'ADMIN' && role !== 'CLIENT') redirect('/')
  const isAdmin = role === 'ADMIN'

  // Client list powers the admin-only schedule card + client filter.
  const data = isAdmin
    ? await apiGet<ClientsResp>('/api/settings/clients').catch(() => null)
    : null
  const clients = (data?.clients ?? [])
    .filter((c) => c.isActive)
    .map((c) => ({ id: c.id, name: c.name }))

  return (
    <main className="min-h-screen text-white p-6 md:p-8">
      <h1 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500 mb-6">
        AI Reports
      </h1>
      <AiReports clients={clients} isAdmin={isAdmin} />
    </main>
  )
}
