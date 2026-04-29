'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Server Action : création d'un compte bancaire pour l'utilisateur courant.
 * Couvre FR6 + FR7 (toggle pro/perso à la création).
 */
export async function createAccount(formData: FormData) {
  const name = formData.get('name')
  const isHybrid = formData.get('is_hybrid') === 'on'

  if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
    redirect('/dashboard?error=invalid-name')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.from('accounts').insert({
    user_id: user.id,
    name: name.trim(),
    is_hybrid: isHybrid,
  })

  if (error) {
    redirect('/dashboard?error=create-failed')
  }

  revalidatePath('/dashboard')
}
