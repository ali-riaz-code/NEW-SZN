import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { auth } from '@/auth'
import { AppShell } from '@/components/app-nav'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'NEW SZN',
  description: 'Agency performance dashboard',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Show the nav only for authenticated sessions (hidden on /login and /auth/*,
  // which have no session).
  const session = await auth()
  const role = session?.user?.role as 'ADMIN' | 'CLOSER' | 'SETTER' | 'CLIENT' | undefined

  return (
    <html lang="en" className={jakarta.className}>
      <body className="bg-[#0a0a0a]">
        {role ? (
          <AppShell
            role={role}
            userName={session?.user?.name ?? undefined}
            email={session?.user?.email ?? undefined}
          >
            {children}
          </AppShell>
        ) : (
          children
        )}
      </body>
    </html>
  )
}
