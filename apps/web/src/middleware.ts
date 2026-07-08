import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

const PUBLIC = ['/login', '/auth/']

// Each role's home screen. Setters and closers have no Master Dashboard —
// they land directly on their own workspace after login and any denied route.
const ROLE_HOME: Record<string, string> = {
  ADMIN: '/',
  CLIENT: '/',
  CLOSER: '/sales',
  SETTER: '/setter',
}

const ROLE_GUARD: [string, string[]][] = [
  ['/settings', ['ADMIN']],
  ['/setter', ['ADMIN', 'SETTER']],
  ['/sales', ['ADMIN', 'CLOSER']],
  ['/ads', ['ADMIN', 'CLIENT']],
  ['/call-logs', ['ADMIN', 'CLOSER']],
  ['/follow-ups', ['ADMIN', 'CLOSER']],
  ['/ai-reports', ['ADMIN', 'CLIENT']],
]

// Friendly aliases people type by hand — send them to the real route.
const ALIASES: Record<string, string> = {
  '/dashboard': '/',
  '/appointment-setting': '/setter',
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p))

  if (isPublic) {
    if (session && pathname === '/login') {
      const home = ROLE_HOME[session.user.role] ?? '/'
      return NextResponse.redirect(new URL(home, req.url))
    }
    return NextResponse.next()
  }

  if (!session) {
    const url = new URL('/login', req.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  const role = session.user.role
  const home = ROLE_HOME[role] ?? '/'

  // Resolve aliases first so the guard below applies to the real route.
  const alias = ALIASES[pathname]
  if (alias !== undefined) {
    return NextResponse.redirect(new URL(alias === '/' ? home : alias, req.url))
  }

  // '/' is the Master Dashboard — setters and closers are rerouted to their home.
  if (pathname === '/' && home !== '/') {
    return NextResponse.redirect(new URL(home, req.url))
  }

  for (const [route, allowed] of ROLE_GUARD) {
    if (pathname.startsWith(route)) {
      if (!allowed.includes(role)) {
        return NextResponse.redirect(new URL(home, req.url))
      }
      break
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
