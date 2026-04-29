'use server'

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

  // Vérifie ownership de la transaction (RLS le ferait aussi, mais on veut un
  // message d'erreur clair si la transaction n'est pas accessible)
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

  // Redirect vers la page du mois où vit la transaction
  const monthSlug = monthSlugFromOpDate(transaction.op_date)
  redirect(`/accounts/${accountId}/months/${monthSlug}`)
}
