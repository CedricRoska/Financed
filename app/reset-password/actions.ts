'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updatePassword(formData: FormData) {
  const password = formData.get('password')

  if (typeof password !== 'string' || password.length < 6) {
    redirect('/reset-password?error=password-too-short')
  }

  const supabase = await createClient()

  // Quand l'utilisateur clique le lien dans l'email, Supabase établit une session
  // de récupération via le code dans l'URL. updateUser passe alors le password.
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect('/reset-password?error=update-failed')
  }

  redirect('/dashboard')
}
