import { LogoMark } from '@/components/icons'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a]">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <LogoMark className="h-6 w-auto" />
          <div>
            <p className="text-white font-bold text-sm tracking-[0.06em] leading-none">
              NEW SZN<sup className="text-[8px] font-bold ml-px">®</sup>
            </p>
            <p className="mt-0.5 text-[9px] tracking-[0.16em] uppercase text-gray-600">
              Agency Performance
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 bg-[#111111] border border-white/[0.06]">
          {children}
        </div>
      </div>
    </div>
  )
}
