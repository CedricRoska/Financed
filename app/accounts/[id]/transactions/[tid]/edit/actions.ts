'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
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
 */
export async function saveAnnotation(formData: FormData) {
  const transactionId = formData.get('transaction_id')
  const accountId = formData.get('account_id')

  if (typeof transactionId !== 'string' || typeof accountId !== 'string') {
    redirect('/dashboard')
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
    redirect(`/accounts/${accountId}`)
  }

  const proPersoRaw = emptyToNull(formData.get('pro_perso'))
  const proPerso =
    proPersoRaw === 'pro' || proPersoRaw === 'perso' ? proPersoRaw : null

  const { error } = await supabase.from('transaction_annotations').upsert(
    {
      transaction_id: transactionId,
      user_id: user.id,
      category: emptyToNull(formData.get('category')),
      comment: emptyToNull(formData.get('comment')),
      pro_perso: proPerso,
      expected_refund_from: emptyToNull(formData.get('expected_refund_from')),
      expected_refund_label: emptyToNull(formData.get('expected_refund_label')),
    },
    { onConflict: 'transaction_id' },
  )

  if (error) {
    redirect(
      `/accounts/${accountId}/transactions/${transactionId}/edit?error=save-failed`,
    )
  }

  const monthSlug = monthSlugFromOpDate(transaction.op_date)
  revalidatePath(`/accounts/${accountId}/months/${monthSlug}`)
  revalidatePath(`/accounts/${accountId}`)
  redirect(`/accounts/${accountId}/months/${monthSlug}`)
}

type ResolveRefundKind = 'cash' | 'wire' | 'loss'

/**
 * Server Action : marque un remboursement attendu comme résolu.
 *
 * Trois types de résolution :
 *   - cash : reçu en liquide (la transaction de remboursement n'apparaîtra pas dans le compte)
 *   - wire : reçu sur le compte (virement visible)
 *   - loss : passé en perte (créance abandonnée volontairement)
 *
 * Une fois résolu, la transaction d'origine devient "validée" si elle a une catégorie.
 */
export async function resolveExpectedRefund(formData: FormData) {
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
    redirect(`/accounts/${accountId}`)
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
    redirect(`/accounts/${accountId}`)
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
    redirect(
      `/accounts/${accountId}/transactions/${transactionId}/edit?error=resolve-failed`,
    )
  }

  const monthSlug = monthSlugFromOpDate(transaction.op_date)
  revalidatePath(`/accounts/${accountId}/months/${monthSlug}`)
  revalidatePath(`/accounts/${accountId}`)
  redirect(`/accounts/${accountId}/months/${monthSlug}`)
}

/**
 * Server Action : annule la résolution d'un remboursement (le remet en attente).
 */
export async function unresolveExpectedRefund(formData: FormData) {
  const transactionId = formData.get('transaction_id')
  const accountId = formData.get('account_id')

  if (typeof transactionId !== 'string' || typeof accountId !== 'string') {
    redirect('/dashboard')
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
    redirect(`/accounts/${accountId}`)
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
    redirect(
      `/accounts/${accountId}/transactions/${transactionId}/edit?error=unresolve-failed`,
    )
  }

  const monthSlug = monthSlugFromOpDate(transaction.op_date)
  revalidatePath(`/accounts/${accountId}/months/${monthSlug}`)
  revalidatePath(`/accounts/${accountId}`)
  redirect(`/accounts/${accountId}/months/${monthSlug}`)
}
