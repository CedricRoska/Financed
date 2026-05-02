'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function sendResetEmail(formData: FormData) {
  const email = formData.get('email')
  if (typeof email !== 'string' || email.trim() === '') {
    redirect('/forgot-password?error=invalid-form')
  }

  const supabase = await createClient()

  // Le redirectTo doit pointer vers /reset-password ; Supabase ajoutera les
  // tokens dans le hash de l'URL ou en query params selon la config.
  const headers = new Headers()
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${baseUrl}/reset-password`,
  })

  // On ne révèle pas si l'email existe ou non (privacy)
  if (error) {
    // Log côté serveur mais user voit toujours le succès
    console.error('Password reset error:', error.message)
  }

  redirect('/forgot-password?sent=1')
  void headers
}
