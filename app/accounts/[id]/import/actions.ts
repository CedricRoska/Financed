'use server'

import { createClient } from '@/lib/supabase/server'
import type {
  CommitResult,
  ImportPreview,
  ParsedTransaction,
  PreviewedTransaction,
} from '@/lib/import/types'

/**
 * Vérifie que l'utilisateur authentifié possède bien le compte ciblé.
 * RLS protège déjà mais on double-check explicitement pour des messages d'erreur clairs.
 */
async function ensureAccountOwnership(accountId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Session expirée. Reconnecte-toi.')

  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .maybeSingle()

  if (!account) throw new Error('Compte introuvable ou accès refusé.')

  return { supabase, user }
}

/** Limite la taille de l'URL PostgREST sur `IN (...)` : 64 chars par hash × 100 = 6.4 Ko. */
const HASH_CHUNK_SIZE = 100

/**
 * Server Action : query la DB pour identifier les transactions déjà présentes
 * et marquer chaque transaction comme `new` ou `duplicate`.
 *
 * Couvre FR15 (détection de doublons par hash) côté DB.
 *
 * Le query est chunké : un `.in('hash', [...])` avec ~260 hashes produit une
 * URL de ~17 Ko qui dépasse la limite par défaut de PostgREST. On découpe en
 * lots de 100 hashes max pour rester sous la limite.
 */
export async function previewImport(
  transactions: ParsedTransaction[],
  accountId: string,
): Promise<ImportPreview> {
  if (transactions.length === 0) {
    throw new Error('Aucune transaction à prévisualiser.')
  }

  const { supabase, user } = await ensureAccountOwnership(accountId)

  const hashes = transactions.map((t) => t.hash)
  const existingHashes = new Set<string>()

  for (let i = 0; i < hashes.length; i += HASH_CHUNK_SIZE) {
    const chunk = hashes.slice(i, i + HASH_CHUNK_SIZE)
    const { data, error } = await supabase
      .from('transactions')
      .select('hash')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .in('hash', chunk)

    if (error) {
      throw new Error(`Erreur lors de la vérification des doublons : ${error.message}`)
    }

    for (const row of data ?? []) {
      existingHashes.add(row.hash)
    }
  }

  const previewed: PreviewedTransaction[] = transactions.map((t) => ({
    ...t,
    status: existingHashes.has(t.hash) ? 'duplicate' : 'new',
  }))

  const newCount = previewed.filter((t) => t.status === 'new').length
  const duplicateCount = previewed.length - newCount

  return {
    transactions: previewed,
    total: previewed.length,
    newCount,
    duplicateCount,
  }
}

/**
 * Server Action : insère les transactions nouvelles + un entry audit_log.
 *
 * Le client envoie l'array complet (incluant les doublons), le serveur filtre
 * et n'insère que les `new`. Cela évite un round-trip et garantit que la
 * source de vérité reste la DB.
 */
export async function commitImport(
  transactions: PreviewedTransaction[],
  accountId: string,
  fileName: string,
): Promise<CommitResult> {
  if (transactions.length === 0) {
    throw new Error('Aucune transaction à importer.')
  }

  const { supabase, user } = await ensureAccountOwnership(accountId)

  const newOnes = transactions.filter((t) => t.status === 'new')
  const duplicates = transactions.length - newOnes.length

  if (newOnes.length === 0) {
    // Tous doublons : pas d'INSERT mais on log quand même la tentative
    const { error: auditError } = await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'import_csv',
      metadata: {
        accountId,
        fileName,
        total: transactions.length,
        inserted: 0,
        duplicates,
      },
    })
    if (auditError) {
      throw new Error(`Erreur audit log : ${auditError.message}`)
    }
    return { inserted: 0, duplicates }
  }

  const rows = newOnes.map((t) => ({
    user_id: user.id,
    account_id: accountId,
    op_date: t.op_date,
    amount: t.amount,
    raw_label: t.raw_label,
    hash: t.hash,
  }))

  const { error: insertError } = await supabase.from('transactions').insert(rows)

  if (insertError) {
    throw new Error(`Erreur insertion transactions : ${insertError.message}`)
  }

  const { error: auditError } = await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'import_csv',
    metadata: {
      accountId,
      fileName,
      total: transactions.length,
      inserted: newOnes.length,
      duplicates,
    },
  })

  if (auditError) {
    // INSERT transactions a réussi, audit_log a échoué : on log côté server mais on n'échoue pas
    console.error('audit_log insert failed:', auditError.message)
  }

  return { inserted: newOnes.length, duplicates }
}
