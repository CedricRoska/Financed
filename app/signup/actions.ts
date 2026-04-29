'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Server Action : création de compte email / password.
 * Couvre FR1 du PRD. Présuppose email confirmation OFF côté Supabase.
 */
export async function signup(formData: FormData) {
  const email = formData.get('email')
  const password = formData.get('password')

  if (typeof email !== 'string' || typeof password !== 'string') {
    redirect('/signup?error=invalid-form')
  }

  if (password.length < 6) {
    redirect('/signup?error=password-too-short')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      redirect('/signup?error=email-taken')
    }
    redirect('/signup?error=signup-failed')
  }

  redirect('/dashboard')
}
