'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Server Action : renomme un compte bancaire.
 * Couvre FR8 (rename).
 */
export async function renameAccount(formData: FormData) {
  const accountId = formData.get('account_id')
  const name = formData.get('name')

  if (typeof accountId !== 'string' || typeof name !== 'string') {
    redirect('/dashboard')
  }

  const trimmed = name.trim()
  if (trimmed.length < 1 || trimmed.length > 100) {
    redirect(`/accounts/${accountId}?error=invalid-name`)
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('accounts')
    .update({ name: trimmed })
    .eq('id', accountId)
    .eq('user_id', user.id)

  if (error) {
    redirect(`/accounts/${accountId}?error=rename-failed`)
  }

  revalidatePath(`/accounts/${accountId}`)
  revalidatePath('/dashboard')
  redirect(`/accounts/${accountId}`)
}

/**
 * Server Action : active le mode hybride pro/perso sur un compte existant.
 * Déclenchée quand l'utilisateur tente de classer une transaction Pro/Perso
 * sur un compte qui n'est pas encore hybride.
 */
export async function activateHybrid(accountId: string): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('accounts')
    .update({ is_hybrid: true })
    .eq('id', accountId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(`Erreur activation hybride : ${error.message}`)
  }

  revalidatePath(`/accounts/${accountId}`)
}

/**
 * Server Action : supprime un compte bancaire et ses données associées (cascade).
 * Couvre FR8 (delete).
 */
export async function deleteAccount(formData: FormData) {
  const accountId = formData.get('account_id')

  if (typeof accountId !== 'string') {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', accountId)
    .eq('user_id', user.id)

  if (error) {
    redirect(`/accounts/${accountId}?error=delete-failed`)
  }

  // Audit log
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'account_deleted',
    metadata: { accountId },
  })

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
