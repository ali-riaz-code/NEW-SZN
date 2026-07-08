'use client'
import Link from 'next/link'
import { motion } from 'motion/react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  DashboardGridIcon,
  BarChartIcon,
  TargetIcon,
  CalendarIcon,
  PhoneIcon,
  BookmarkIcon,
  SettingsGearIcon,
  FileTextIcon,
  LogoutIcon,
  MenuIcon,
  CloseIcon,
  LogoMark,
} from '@/components/icons'
import { signOutAction } from '@/app/auth-actions'

type Role = 'ADMIN' | 'CLOSER' | 'SETTER' | 'CLIENT'

interface NavItem {
  href: string
  label: string
  Icon: React.ComponentType<{ size?: number }>
}

const ADMIN_PRIMARY: NavItem[] = [
  { href: '/',       label: 'Master Dashboard',     Icon: DashboardGridIcon },
  { href: '/sales',  label: 'Sales & Closing',      Icon: BarChartIcon },
  { href: '/ads',    label: 'Ads',                  Icon: TargetIcon },
  { href: '/setter', label: 'Appointment Setting',  Icon: CalendarIcon },
]
const ADMIN_SECONDARY: NavItem[] = [
  { href: '/call-logs',  label: 'Call Logs',  Icon: PhoneIcon },
  { href: '/ai-reports', label: 'AI Reports', Icon: FileTextIcon },
  { href: '/settings',   label: 'Settings',   Icon: SettingsGearIcon },
]

// Strict per-role menus (RBAC): closers and setters have no Master Dashboard;
// clients get a read-only AI Reports archive alongside their own dashboards.
const NAV: Record<Role, { primary: NavItem[]; secondary?: NavItem[] }> = {
  ADMIN:  { primary: ADMIN_PRIMARY, secondary: ADMIN_SECONDARY },
  CLOSER: { primary: [
    { href: '/sales',     label: 'Sales & Closing', Icon: BarChartIcon },
    { href: '/call-logs', label: 'Call Logs',       Icon: PhoneIcon },
  ]},
  SETTER: { primary: [
    { href: '/setter', label: 'Appointment Setting', Icon: CalendarIcon },
  ]},
  CLIENT: { primary: [
    { href: '/',           label: 'Dashboard',  Icon: DashboardGridIcon },
    { href: '/ads',        label: 'Ads',        Icon: TargetIcon },
    { href: '/ai-reports', label: 'AI Reports', Icon: FileTextIcon },
  ]},
}

const MotionLink = motion.create(Link)

function NavLink({ href, label, Icon, active, onNavigate }: NavItem & { active: boolean; onNavigate?: () => void }) {
  return (
    <MotionLink
      href={href}
      onClick={onNavigate}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className={`group relative flex items-center gap-3 rounded-full px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ease-out hover:translate-x-[3px] ${
        active
          ? 'bg-white/[0.07] text-white'
          : 'text-gray-500 hover:bg-white/[0.04] hover:text-gray-200'
      }`}
    >
      {/* Left accent bar — dim on hover, solid gold when active */}
      <span
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] rounded-full transition-all duration-200 ease-out ${
          active
            ? 'h-[20px] bg-[#c9a96e] opacity-100'
            : 'h-[16px] bg-[#c9a96e] opacity-0 group-hover:opacity-50'
        }`}
      />
      <span className={`flex-shrink-0 transition-colors duration-150 ${active ? 'text-[#c9a96e]' : 'text-current'}`}>
        <Icon size={15} />
      </span>
      {label}
    </MotionLink>
  )
}

export function AppNav({
  role,
  open = false,
  onClose,
}: {
  role: Role
  open?: boolean
  onClose?: () => void
}) {
  const pathname = usePathname()
  const { primary, secondary } = NAV[role] ?? NAV.CLIENT

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile overlay — tap to dismiss the drawer */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 flex h-screen w-60 flex-col bg-[#0d0b09] border-r border-white/[0.05] transition-transform duration-200 ease-out md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundImage: 'radial-gradient(ellipse 140% 40% at 50% 100%, rgba(201,169,110,0.06) 0%, transparent 60%)' }}
      >

      {/* ── Brand ── */}
      {/* h-[73px] matches the top bar's height so the two dividers line up exactly */}
      <div className="h-[73px] flex items-center justify-between px-5 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.06] shadow-[0_0_20px_rgba(0,0,0,0.4)]">
            <LogoMark className="h-6 w-auto drop-shadow-[0_0_8px_rgba(233,30,99,0.25)]" />
          </div>
          <div>
            <p className="text-[13px] font-bold tracking-[0.06em] uppercase text-white leading-none">
              NEW SZN<sup className="text-[8px] font-bold ml-px">®</sup>
            </p>
            <p className="mt-0.5 text-[9px] tracking-[0.16em] uppercase text-gray-600">
              Agency Performance
            </p>
          </div>
        </div>
        {/* Close (mobile drawer only) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.05] md:hidden"
        >
          <CloseIcon size={14} />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-2.5 pt-5 pb-2 space-y-0.5">
        <p className="mb-3 px-3 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/20">
          Menu
        </p>

        {primary.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
        ))}

        {secondary && secondary.length > 0 && (
          <>
            <div className="my-3 mx-1 border-t border-white/[0.05]" />
            {secondary.map((item) => (
              <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
            ))}
          </>
        )}
      </nav>

      {/* ── Bottom card ── */}
      <div className="p-3 pb-4">
        <div className="relative overflow-hidden rounded-xl border border-white/[0.05] bg-[#111111] p-4"">
          <div className="relative">
            <div className="mb-2.5 flex h-7 w-7 items-center justify-center rounded-md bg-black/25 border border-white/[0.08]">
              <LogoMark className="h-4 w-auto" />
            </div>
            <p className="text-[12px] font-bold text-white leading-snug">New season energy</p>
            <p className="mt-0.5 text-[10px] text-white/40 leading-snug">Keep the numbers moving.</p>
            {role === 'ADMIN' && (
              <Link
                href="/settings"
                onClick={onClose}
                className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[#c9a96e]/20 bg-[#c9a96e]/[0.08] px-3 py-1.5 text-[11px] font-semibold text-[#c9a96e]/90 transition-colors hover:bg-[#c9a96e]/[0.15] hover:text-[#c9a96e]"
              >
                + Add Client
              </Link>
            )}
          </div>
        </div>
      </div>
      </aside>
    </>
  )
}

export function AppHeader({
  role,
  userName,
  email,
  onMenuClick,
}: {
  role: Role
  userName?: string
  email?: string
  onMenuClick?: () => void
}) {
  const initials = (userName ?? email ?? role)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 1)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <header className="fixed top-0 left-0 md:left-60 right-0 z-20 h-[73px] flex items-center justify-between gap-3 px-4 md:px-8 bg-[#0a0a0a]/90 backdrop-blur-sm border-b border-white/[0.05]">
      {/* Left: hamburger (mobile) + user info */}
      <div className="flex items-center gap-[10px] min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-gray-400 hover:text-white hover:bg-white/[0.06] md:hidden"
        >
          <MenuIcon size={16} />
        </button>
        <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-[#c9a96e]/15 text-[15px] font-bold text-[#c9a96e] leading-none border border-[#c9a96e]/20">
          {initials || '—'}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-white leading-none truncate">
            {userName ?? email ?? 'Signed in'}
          </p>
          <p className="mt-0.5 text-[9px] text-white/30">Signed in</p>
        </div>
        {/* Role badge — always rendered from the live session role */}
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#c9a96e]/10 text-[#c9a96e] border border-[#c9a96e]/20 whitespace-nowrap">
          {role}
        </span>
      </div>

      {/* Right: sign out */}
      <form action={signOutAction}>
        <button
          type="submit"
          className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-white/50 transition-all duration-150 hover:bg-red-500/[0.08] hover:text-red-400 hover:border-red-500/[0.15]"
        >
          <span className="text-[12px] font-medium">Sign out</span>
          <LogoutIcon size={15} />
        </button>
      </form>
    </header>
  )
}

// Client shell that owns the mobile drawer state. Server layout passes the
// (server-rendered) page as children — only the chrome is client-side.
export function AppShell({
  role,
  userName,
  email,
  children,
}: {
  role: Role
  userName?: string
  email?: string
  children: React.ReactNode
}) {
  const [navOpen, setNavOpen] = useState(false)
  const pathname = usePathname()

  // Close the drawer on any route change (e.g. browser back/forward).
  useEffect(() => {
    setNavOpen(false)
  }, [pathname])

  return (
    <>
      <AppNav role={role} open={navOpen} onClose={() => setNavOpen(false)} />
      <AppHeader
        role={role}
        userName={userName}
        email={email}
        onMenuClick={() => setNavOpen(true)}
      />
      <div className="md:ml-60 pt-[73px]">{children}</div>
    </>
  )
}
