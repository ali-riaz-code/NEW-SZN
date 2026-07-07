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
  if (session.user.role !== 'ADMIN') redirect('/')

  const data = await apiGet<ClientsResp>('/api/settings/clients').catch(() => null)
  const clients = (data?.clients ?? [])
    .filter((c) => c.isActive)
    .map((c) => ({ id: c.id, name: c.name }))

  return (
    <main className="min-h-screen text-white p-6 md:p-8">
      <h1 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500 mb-6">
        AI Reports
      </h1>
      <AiReports clients={clients} />
    </main>
  )
}
