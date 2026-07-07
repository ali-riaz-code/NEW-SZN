import { SailIcon } from '@/components/icons'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#08080f' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <SailIcon size={24} />
          <span
            className="text-white font-semibold text-sm"
            style={{ letterSpacing: '0.08em' }}
          >
            NEW SZN
          </span>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{
            backgroundColor: '#0f0f1a',
            border: '1px solid rgba(255,255,255,0.055)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
