'use server'
import { signIn } from '@/auth'
import { AuthError } from 'next-auth'

export async function loginAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  try {
    await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirectTo: '/',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Incorrect email or password.' }
        default:
          return { error: 'Something went wrong. Please try again.' }
      }
    }
    throw error
  }
  return null
}
