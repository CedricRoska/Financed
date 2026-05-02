'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { monthSlugFromOpDate } from '@/lib/months/format'

type BulkApplyInput = {
  transactionIds: string[]
  accountId: string
  category?: string | null
  proPerso?: 'pro' | 'perso' | null | 'unset'
}

/**
 * Server Action : applique en masse une catégorie et/ou pro_perso à plusieurs transactions.
 *
 * UPSERT par transaction_id (clé UNIQUE). Si une transaction a déjà une annotation,
 * on met à jour seulement les champs fournis. Les autres champs (commentaire,
 * remboursement attendu, résolution) sont préservés.
 *
 * `proPerso === 'unset'` permet de remettre à null explicitement.
 */
export async function bulkApplyAnnotation({
  transactionIds,
  accountId,
  category,
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

  // Récupère les annotations existantes pour merger proprement
  const { data: existing } = await supabase
    .from('transaction_annotations')
    .select('transaction_id, category, pro_perso, comment, expected_refund_from, expected_refund_label, refund_resolved_at, refund_resolved_kind, refund_resolved_note')
    .in('transaction_id', transactionIds)
    .eq('user_id', user.id)

  const existingByTxId = new Map(
    (existing ?? []).map((row) => [row.transaction_id, row]),
  )

  const upserts = transactionIds.map((transactionId) => {
    const prev = existingByTxId.get(transactionId)
    const nextProPerso =
      proPerso === undefined
        ? (prev?.pro_perso ?? null)
        : proPerso === 'unset'
          ? null
          : proPerso
    const nextCategory =
      category === undefined ? (prev?.category ?? null) : category

    return {
      transaction_id: transactionId,
      user_id: user.id,
      category: nextCategory,
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
