'use client'
import { useRouter, useSearchParams } from 'next/navigation'

interface Client {
  id: string
  name: string
}

export function ClientSelector({
  clients,
  currentClientId,
}: {
  clients: Client[]
  currentClientId: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  if (clients.length <= 1) return null

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('clientId', e.target.value)
    router.push(`/ads?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-600">Client</span>
      <select
        value={currentClientId}
        onChange={handleChange}
        className="bg-[#161616] border border-white/[0.08] text-white text-xs font-medium rounded-lg px-3 py-1.5 appearance-none cursor-pointer hover:border-[#c9a96e]/30 focus:outline-none focus:border-[#c9a96e]/40 transition-colors pr-7"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b7280' strokeWidth='1.5' fill='none' strokeLinecap='round' strokeLinejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
        }}
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}
