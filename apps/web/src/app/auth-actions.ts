'use server'
import { signOut } from '@/auth'

// Ends the NextAuth session and returns the user to the login screen.
export async function signOutAction() {
  await signOut({ redirectTo: '/login' })
}
