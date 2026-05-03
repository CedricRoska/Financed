'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { monthSlugFromOpDate } from '@/lib/months/format'

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Server Action : UPSERT d'une annotation transaction.
 * Couvre FR28 (catégorie), FR31 (commentaire), FR37 (expected refund).
 *
 * Ne redirige plus — retourne juste un résultat. Le client gère la
 * navigation / la fermeture de la Sheet / l'auto-advance.
 *
 * Validation : catégorie ≥ 2 chars (sinon traitée comme vide).
 */
export async function saveAnnotation(formData: FormData): Promise<void> {
  const transactionId = formData.get('transaction_id')
  const accountId = formData.get('account_id')

  if (typeof transactionId !== 'string' || typeof accountId !== 'string') {
    throw new Error('Données de formulaire invalides')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: transaction } = await supabase
    .from('transactions')
    .select('id, op_date')
    .eq('id', transactionId)
    .maybeSingle()

  if (!transaction) {
    throw new Error('Transaction introuvable')
  }

  const proPersoRaw = emptyToNull(formData.get('pro_perso'))
  const proPerso =
    proPersoRaw === 'pro' || proPersoRaw === 'perso' ? proPersoRaw : null

  const toInvestigate = formData.get('to_investigate') === '1'

  // Validation catégorie ≥ 2 chars (sinon null). Si flag "à investiguer" actif,
  // on force category/subcategory à null : le user n'a pas encore décidé.
  const categoryRaw = emptyToNull(formData.get('category'))
  const category =
    toInvestigate ? null : categoryRaw && categoryRaw.length >= 2 ? categoryRaw : null

  const subcategoryRaw = emptyToNull(formData.get('subcategory'))
  // Sous-catégorie ne peut exister que si une catégorie est définie
  const subcategory =
    category && subcategoryRaw && subcategoryRaw.length >= 2 ? subcategoryRaw : null

  // expected_refund_amount peut arriver en € absolus ou en %, selon l'unité
  // choisie côté UI. On stocke toujours en € absolus.
  const expectedRefundFrom = emptyToNull(formData.get('expected_refund_from'))
  const refundAmountRaw = formData.get('expected_refund_amount')
  const refundAmountUnit = formData.get('expected_refund_amount_unit')
  let expectedRefundAmount: number | null = null
  if (
    expectedRefundFrom &&
    typeof refundAmountRaw === 'string' &&
    refundAmountRaw.trim() !== ''
  ) {
    const numeric = Number(refundAmountRaw.replace(',', '.'))
    if (!Number.isNaN(numeric) && numeric > 0) {
      if (refundAmountUnit === 'percent') {
        const expenseAmountRaw = formData.get('expense_amount')
        const expenseAmount =
          typeof expenseAmountRaw === 'string'
            ? Math.abs(Number(expenseAmountRaw))
            : 0
        if (expenseAmount > 0) {
          expectedRefundAmount = Math.round((numeric / 100) * expenseAmount * 100) / 100
        }
      } else {
        expectedRefundAmount = Math.round(numeric * 100) / 100
      }
    }
  }

  const { error } = await supabase.from('transaction_annotations').upsert(
    {
      transaction_id: transactionId,
      user_id: user.id,
      category,
      subcategory,
      comment: emptyToNull(formData.get('comment')),
      pro_perso: proPerso,
      expected_refund_from: expectedRefundFrom,
      expected_refund_label: emptyToNull(formData.get('expected_refund_label')),
      expected_refund_amount: expectedRefundAmount,
      to_investigate: toInvestigate,
    },
    { onConflict: 'transaction_id' },
  )

  if (error) {
    throw new Error(`Erreur sauvegarde : ${error.message}`)
  }

  const monthSlug = monthSlugFromOpDate(transaction.op_date)
  revalidatePath(`/accounts/${accountId}/months/${monthSlug}`)
  revalidatePath(`/accounts/${accountId}`)
}

type ResolveRefundKind = 'cash' | 'wire' | 'loss'

/**
 * Server Action : marque un remboursement attendu comme résolu.
 */
export async function resolveExpectedRefund(formData: FormData): Promise<void> {
  const transactionId = formData.get('transaction_id')
  const accountId = formData.get('account_id')
  const kind = formData.get('kind')
  const note = emptyToNull(formData.get('note'))

  if (
    typeof transactionId !== 'string' ||
    typeof accountId !== 'string' ||
    typeof kind !== 'string' ||
    !['cash', 'wire', 'loss'].includes(kind)
  ) {
    throw new Error('Données invalides')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: transaction } = await supabase
    .from('transactions')
    .select('id, op_date')
    .eq('id', transactionId)
    .maybeSingle()

  if (!transaction) {
    throw new Error('Transaction introuvable')
  }

  const { error } = await supabase
    .from('transaction_annotations')
    .update({
      refund_resolved_at: new Date().toISOString(),
      refund_resolved_kind: kind as ResolveRefundKind,
      refund_resolved_note: note,
    })
    .eq('transaction_id', transactionId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(`Erreur résolution : ${error.message}`)
  }

  const monthSlug = monthSlugFromOpDate(transaction.op_date)
  revalidatePath(`/accounts/${accountId}/months/${monthSlug}`)
  revalidatePath(`/accounts/${accountId}`)
}

/**
 * Server Action : annule la résolution d'un remboursement.
 */
export async function unresolveExpectedRefund(formData: FormData): Promise<void> {
  const transactionId = formData.get('transaction_id')
  const accountId = formData.get('account_id')

  if (typeof transactionId !== 'string' || typeof accountId !== 'string') {
    throw new Error('Données invalides')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: transaction } = await supabase
    .from('transactions')
    .select('id, op_date')
    .eq('id', transactionId)
    .maybeSingle()

  if (!transaction) {
    throw new Error('Transaction introuvable')
  }

  const { error } = await supabase
    .from('transaction_annotations')
    .update({
      refund_resolved_at: null,
      refund_resolved_kind: null,
      refund_resolved_note: null,
    })
    .eq('transaction_id', transactionId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(`Erreur annulation : ${error.message}`)
  }

  const monthSlug = monthSlugFromOpDate(transaction.op_date)
  revalidatePath(`/accounts/${accountId}/months/${monthSlug}`)
  revalidatePath(`/accounts/${accountId}`)
}
