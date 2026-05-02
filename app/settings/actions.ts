'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Server Action : export complet des données utilisateur en JSON.
 * Couvre FR51 (RGPD self-service export en < 60s).
 *
 * Retourne le JSON sérialisé. Le client le télécharge comme fichier.
 */
export async function exportUserData(): Promise<string> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [accountsResp, transactionsResp, annotationsResp, auditResp] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('*')
      .order('op_date', { ascending: true }),
    supabase
      .from('transaction_annotations')
      .select('*')
      .order('created_at', { ascending: true }),
    supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: true }),
  ])

  const exportPayload = {
    schema: 'financed/v1',
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    accounts: accountsResp.data ?? [],
    transactions: transactionsResp.data ?? [],
    transaction_annotations: annotationsResp.data ?? [],
    audit_log: auditResp.data ?? [],
  }

  // Log l'export dans audit_log
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'rgpd_export',
    metadata: {
      counts: {
        accounts: exportPayload.accounts.length,
        transactions: exportPayload.transactions.length,
        annotations: exportPayload.transaction_annotations.length,
      },
    },
  })

  return JSON.stringify(exportPayload, null, 2)
}

/**
 * Server Action : suppression définitive du compte utilisateur.
 * Couvre FR5 + NFR27 (cascade DELETE en < 24h).
 *
 * La cascade est gérée au niveau Postgres : DELETE auth.users supprime
 * tous les accounts/transactions/annotations/audit_log de l'utilisateur
 * via les ON DELETE CASCADE des FK.
 */
export async function deleteUserAccount() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // On peut supprimer les rows dans tables custom via le client utilisateur
  // (RLS cascade DELETE), puis signOut. La suppression du compte auth lui-même
  // requiert le service_role et serait faite via une route handler API.
  await supabase.from('accounts').delete().eq('user_id', user.id)
  await supabase.from('audit_log').delete().eq('user_id', user.id)
  // (transactions, transaction_annotations sont cascade depuis accounts)

  await supabase.auth.signOut()

  // Note : la ligne dans auth.users persiste si on n'utilise pas service_role.
  // Pour V1 solo, le user supprime ses datas (RGPD effacement) ; un job admin
  // pourra purger auth.users périodiquement via service_role.
  revalidatePath('/dashboard')
  redirect('/login')
}
