import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { apiGet } from '@/lib/api'
import { CallLogs, type CloserOption } from './call-logs'

interface UsersResp {
  users: Array<{ id: string; name: string; role: string; isActive: boolean }>
}

export default async function CallLogsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'CLOSER') redirect('/')
  const isAdmin = role === 'ADMIN'

  // Closer dropdown (filter + reassign) is admin-only.
  let closers: CloserOption[] = []
  if (isAdmin) {
    const data = await apiGet<UsersResp>('/api/settings/users').catch(() => null)
    closers = (data?.users ?? [])
      .filter((u) => u.role === 'CLOSER' && u.isActive)
      .map((u) => ({ id: u.id, name: u.name }))
  }

  return (
    <main className="min-h-screen text-white p-6 md:p-8">
      <h1 className="text-[10px] font-semibold tracking-widest uppercase text-gray-500 mb-6">Call Logs</h1>
      <CallLogs isAdmin={isAdmin} closers={closers} />
    </main>
  )
}
