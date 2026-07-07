import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.role = (user as { role?: string }).role
      }
      return token
    },
    session({ session, token }) {
      session.user.userId = token.userId as string
      session.user.role = token.role as string
      return session
    },
  },
  providers: [],
}
