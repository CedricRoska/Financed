'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { monthSlugFromOpDate } from '@/lib/months/format'

type BulkApplyInput = {
  transactionIds: string[]
  accountId: string
  category?: string | null
  subcategory?: string | null
  proPerso?: 'pro' | 'perso'
}

/**
 * Server Action : applique en masse une catégorie et/ou pro_perso à plusieurs transactions.
 *
 * UPSERT par transaction_id (clé UNIQUE). Si une transaction a déjà une annotation,
 * on met à jour seulement les champs fournis. Les autres champs (commentaire,
 * remboursement attendu, résolution) sont préservés.
 */
export async function bulkApplyAnnotation({
  transactionIds,
  accountId,
  category,
  subcategory,
  proPerso,
}: BulkApplyInput): Promise<{ updated: number }> {
  if (transactionIds.length === 0) {
    return { updated: 0 }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: existing } = await supabase
    .from('transaction_annotations')
    .select('transaction_id, category, subcategory, pro_perso, comment, expected_refund_from, expected_refund_label, refund_resolved_at, refund_resolved_kind, refund_resolved_note')
    .in('transaction_id', transactionIds)
    .eq('user_id', user.id)

  const existingByTxId = new Map(
    (existing ?? []).map((row) => [row.transaction_id, row]),
  )

  const upserts = transactionIds.map((transactionId) => {
    const prev = existingByTxId.get(transactionId)
    const nextProPerso =
      proPerso === undefined ? (prev?.pro_perso ?? null) : proPerso
    const nextCategory =
      category === undefined ? (prev?.category ?? null) : category
    const nextSubcategory =
      subcategory === undefined ? (prev?.subcategory ?? null) : subcategory

    return {
      transaction_id: transactionId,
      user_id: user.id,
      category: nextCategory,
      subcategory: nextCategory ? nextSubcategory : null, // sub uniquement si cat
      pro_perso: nextProPerso,
      comment: prev?.comment ?? null,
      expected_refund_from: prev?.expected_refund_from ?? null,
      expected_refund_label: prev?.expected_refund_label ?? null,
      refund_resolved_at: prev?.refund_resolved_at ?? null,
      refund_resolved_kind: prev?.refund_resolved_kind ?? null,
      refund_resolved_note: prev?.refund_resolved_note ?? null,
    }
  })

  const { error } = await supabase
    .from('transaction_annotations')
    .upsert(upserts, { onConflict: 'transaction_id' })

  if (error) {
    throw new Error(`Erreur bulk update : ${error.message}`)
  }

  // Récupère les op_date pour revalider les pages mensuelles concernées
  const { data: txDates } = await supabase
    .from('transactions')
    .select('op_date')
    .in('id', transactionIds)
    .eq('user_id', user.id)

  const months = new Set((txDates ?? []).map((t) => monthSlugFromOpDate(t.op_date)))
  for (const slug of months) {
    revalidatePath(`/accounts/${accountId}/months/${slug}`)
  }
  revalidatePath(`/accounts/${accountId}`)

  return { updated: upserts.length }
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const moneyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

/**
 * Server Action : lettre N dépenses (négatives) avec UNE entrée (positive),
 * et optionnellement applique catégorie/sous-catégorie/pro_perso à TOUTES
 * les lignes (dépenses + entrée).
 *
 * Pour chaque dépense :
 *   - marque le remboursement comme résolu en mode `wire` pointant vers
 *     la transaction positive (label, date, montant)
 *   - efface le flag `to_investigate` (le user a maintenant compris la dépense)
 *
 * Pour la transaction positive et les dépenses :
 *   - applique category/subcategory/proPerso si fournis
 *
 * Retourne le nombre de lignes affectées (lettered + refund line).
 */
export async function bulkLettrage({
  expenseTxIds,
  refundTxId,
  accountId,
  category,
  subcategory,
  proPerso,
}: {
  expenseTxIds: string[]
  refundTxId: string
  accountId: string
  category?: string | null
  subcategory?: string | null
  proPerso?: 'pro' | 'perso'
}): Promise<{ lettered: number }> {
  if (expenseTxIds.length === 0) {
    return { lettered: 0 }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: refundTx } = await supabase
    .from('transactions')
    .select('id, op_date, amount, raw_label')
    .eq('id', refundTxId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!refundTx) {
    throw new Error('Transaction de remboursement introuvable')
  }
  if (Number(refundTx.amount) <= 0) {
    throw new Error('La transaction de remboursement doit être positive')
  }

  const refundDate = dateFormatter.format(new Date(refundTx.op_date))
  const refundAmount = moneyFormatter.format(Number(refundTx.amount))
  const refundLabel = refundTx.raw_label.trim().slice(0, 80)
  const note = `Lettré avec ligne du ${refundDate} (${refundAmount}) — « ${refundLabel} »`

  const allTxIds = [...expenseTxIds, refundTxId]

  const { data: existing } = await supabase
    .from('transaction_annotations')
    .select(
      'transaction_id, category, subcategory, pro_perso, comment, to_investigate, expected_refund_from, expected_refund_label, refund_resolved_at, refund_resolved_kind, refund_resolved_note',
    )
    .in('transaction_id', allTxIds)
    .eq('user_id', user.id)

  const existingByTxId = new Map(
    (existing ?? []).map((row) => [row.transaction_id, row]),
  )

  const nowIso = new Date().toISOString()
  const expenseIdSet = new Set(expenseTxIds)

  const upserts = allTxIds.map((transactionId) => {
    const prev = existingByTxId.get(transactionId)
    const isExpense = expenseIdSet.has(transactionId)

    const nextCategory =
      category === undefined ? (prev?.category ?? null) : category
    const nextSubcategory =
      subcategory === undefined ? (prev?.subcategory ?? null) : subcategory
    const nextProPerso =
      proPerso === undefined ? (prev?.pro_perso ?? null) : proPerso

    if (isExpense) {
      return {
        transaction_id: transactionId,
        user_id: user.id,
        category: nextCategory,
        subcategory: nextCategory ? nextSubcategory : null,
        pro_perso: nextProPerso,
        comment: prev?.comment ?? null,
        to_investigate: false,
        expected_refund_from: refundLabel,
        expected_refund_label: `${refundDate} · ${refundAmount}`,
        refund_resolved_at: nowIso,
        refund_resolved_kind: 'wire' as const,
        refund_resolved_note: note,
      }
    }

    // Refund line itself : just propagate the bulk fields, leave refund metadata untouched.
    return {
      transaction_id: transactionId,
      user_id: user.id,
      category: nextCategory,
      subcategory: nextCategory ? nextSubcategory : null,
      pro_perso: nextProPerso,
      comment: prev?.comment ?? null,
      to_investigate: prev?.to_investigate ?? false,
      expected_refund_from: prev?.expected_refund_from ?? null,
      expected_refund_label: prev?.expected_refund_label ?? null,
      refund_resolved_at: prev?.refund_resolved_at ?? null,
      refund_resolved_kind: prev?.refund_resolved_kind ?? null,
      refund_resolved_note: prev?.refund_resolved_note ?? null,
    }
  })

  const { error } = await supabase
    .from('transaction_annotations')
    .upsert(upserts, { onConflict: 'transaction_id' })

  if (error) {
    throw new Error(`Erreur lettrage : ${error.message}`)
  }

  const { data: txDates } = await supabase
    .from('transactions')
    .select('op_date')
    .in('id', allTxIds)
    .eq('user_id', user.id)

  const months = new Set((txDates ?? []).map((t) => monthSlugFromOpDate(t.op_date)))
  for (const slug of months) {
    revalidatePath(`/accounts/${accountId}/months/${slug}`)
  }
  revalidatePath(`/accounts/${accountId}`)

  return { lettered: expenseTxIds.length }
}
