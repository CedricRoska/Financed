import { redirect } from 'next/navigation'
import { AuthenticatedShell } from '@/components/authenticated-shell'
import { formatMonthLabelFR, parseMonthSlug } from '@/lib/months/format'
import { createClient } from '@/lib/supabase/server'
import { isTransactionToProcess } from '@/lib/transactions/validation'
import { getUserCategories } from '@/app/settings/categories-actions'
import {
  MonthClient,
  type AnnotationLite,
  type EnrichedTransaction,
  type PendingRefund,
} from './MonthClient'

function pickAnnotation(raw: unknown): AnnotationLite | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] ?? null) as AnnotationLite | null
  return raw as AnnotationLite
}

export default async function MonthDetailPage({
  params,
}: {
  params: Promise<{ id: string; month: string }>
}) {
  const { id: accountId, month: monthSlug } = await params

  const parsed = parseMonthSlug(monthSlug)
  if (!parsed) {
    redirect(`/accounts/${accountId}`)
  }

  const supabase = await createClient()

  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, is_hybrid')
    .eq('id', accountId)
    .maybeSingle()

  if (!account) {
    redirect('/dashboard')
  }

  const startDate = `${monthSlug}-01`
  const nextMonth = parsed.month === 12 ? 1 : parsed.month + 1
  const nextYear = parsed.month === 12 ? parsed.year + 1 : parsed.year
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  const { data: transactions } = await supabase
    .from('transactions')
    .select(
      'id, op_date, amount, raw_label, bank_op_type, bank_category, bank_subcategory, transaction_annotations(category, subcategory, comment, pro_perso, expected_refund_from, expected_refund_label, expected_refund_amount, refund_resolved_at, refund_resolved_kind, refund_resolved_note, to_investigate)',
    )
    .eq('account_id', accountId)
    .gte('op_date', startDate)
    .lt('op_date', endDate)
    .order('op_date', { ascending: false })
    .order('id', { ascending: false })

  const enriched: EnrichedTransaction[] = (transactions ?? []).map((t) => {
    const annotation = pickAnnotation(t.transaction_annotations)
    return {
      id: t.id,
      op_date: t.op_date,
      amount: Number(t.amount),
      raw_label: t.raw_label,
      bank_op_type: t.bank_op_type,
      bank_category: t.bank_category,
      bank_subcategory: t.bank_subcategory,
      annotation,
      toProcess: isTransactionToProcess(annotation),
    }
  })

  const userCategories = await getUserCategories()

  // Toutes les dépenses du compte avec un remboursement attendu non résolu,
  // tous mois confondus. Permet le lettrage cross-mois depuis la Sheet d'une
  // ligne `+`. Liste bornée (uniquement non résolues), donc cheap à charger.
  const { data: pendingRefundsRaw } = await supabase
    .from('transactions')
    .select(
      'id, op_date, amount, raw_label, transaction_annotations!inner(expected_refund_from, expected_refund_label, expected_refund_amount, refund_resolved_at)',
    )
    .eq('account_id', accountId)
    .not('transaction_annotations.expected_refund_from', 'is', null)
    .is('transaction_annotations.refund_resolved_at', null)
    .order('op_date', { ascending: false })

  const pendingRefunds: PendingRefund[] = (pendingRefundsRaw ?? [])
    .map((t) => {
      const annotation = pickAnnotation(t.transaction_annotations) as
        | {
            expected_refund_from: string | null
            expected_refund_label: string | null
            expected_refund_amount: number | null
          }
        | null
      const debtor = annotation?.expected_refund_from?.trim() ?? ''
      if (debtor === '') return null
      return {
        id: t.id,
        op_date: t.op_date,
        amount: Number(t.amount),
        raw_label: t.raw_label,
        expected_refund_from: debtor,
        expected_refund_label: annotation?.expected_refund_label ?? null,
        expected_refund_amount:
          annotation?.expected_refund_amount !== null && annotation?.expected_refund_amount !== undefined
            ? Number(annotation.expected_refund_amount)
            : null,
      }
    })
    .filter((x): x is PendingRefund => x !== null)

  return (
    <AuthenticatedShell>
      <MonthClient
        accountId={accountId}
        accountName={account.name}
        isHybrid={account.is_hybrid}
        monthLabel={formatMonthLabelFR(monthSlug)}
        transactions={enriched}
        userCategories={userCategories}
        pendingRefunds={pendingRefunds}
      />
    </AuthenticatedShell>
  )
}
