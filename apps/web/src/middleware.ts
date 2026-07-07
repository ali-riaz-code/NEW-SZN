import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

const PUBLIC = ['/login', '/auth/']

const ROLE_GUARD: [string, string[]][] = [
  ['/settings', ['ADMIN']],
  ['/setter', ['ADMIN', 'SETTER']],
  ['/sales', ['ADMIN', 'CLOSER']],
  ['/ads', ['ADMIN', 'CLIENT']],
  ['/call-logs', ['ADMIN', 'CLOSER']],
]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p))

  if (isPublic) {
    if (session && pathname === '/login') {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  }

  if (!session) {
    const url = new URL('/login', req.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  const role = session.user.role
  for (const [route, allowed] of ROLE_GUARD) {
    if (pathname.startsWith(route)) {
      if (!allowed.includes(role)) {
        return NextResponse.redirect(new URL('/', req.url))
      }
      break
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
