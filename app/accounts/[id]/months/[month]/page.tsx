import { redirect } from 'next/navigation'
import { formatMonthLabelFR, parseMonthSlug } from '@/lib/months/format'
import { createClient } from '@/lib/supabase/server'
import { MonthClient, type AnnotationLite, type EnrichedTransaction } from './MonthClient'

function pickAnnotation(raw: unknown): AnnotationLite | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] ?? null) as AnnotationLite | null
  return raw as AnnotationLite
}

function isUnreconciled(annotation: AnnotationLite | null): boolean {
  if (!annotation) return true
  if (annotation.expected_refund_from && annotation.expected_refund_from.trim() !== '') return true
  if (!annotation.category || annotation.category.trim() === '') return true
  return false
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
      'id, op_date, amount, raw_label, transaction_annotations(category, comment, pro_perso, expected_refund_from, expected_refund_label)',
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
      annotation,
      unreconciled: isUnreconciled(annotation),
    }
  })

  return (
    <MonthClient
      accountId={accountId}
      accountName={account.name}
      isHybrid={account.is_hybrid}
      monthLabel={formatMonthLabelFR(monthSlug)}
      transactions={enriched}
    />
  )
}
