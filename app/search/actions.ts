'use server'

import { createClient } from '@/lib/supabase/server'

export type SearchResult = {
  id: string
  account_id: string
  account_name: string
  op_date: string
  amount: number
  raw_label: string
  category: string | null
  monthSlug: string
}

/**
 * Server Action : recherche cross-historique de transactions.
 * Couvre FR43 (recherche par marchand cross-historique).
 *
 * Cherche dans raw_label et category.category, limite à 20 résultats.
 */
export async function searchTransactions(query: string): Promise<SearchResult[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  // ilike pattern (case-insensitive)
  const pattern = `%${trimmed.replace(/[%_]/g, '\\$&')}%`

  // Recherche dans raw_label
  const { data: byLabel } = await supabase
    .from('transactions')
    .select(
      'id, account_id, op_date, amount, raw_label, accounts(name), transaction_annotations(category)',
    )
    .eq('user_id', user.id)
    .ilike('raw_label', pattern)
    .order('op_date', { ascending: false })
    .limit(20)

  type Row = {
    id: string
    account_id: string
    op_date: string
    amount: number
    raw_label: string
    accounts: { name: string } | { name: string }[] | null
    transaction_annotations:
      | { category: string | null }
      | { category: string | null }[]
      | null
  }

  function pickName(raw: Row['accounts']): string {
    if (!raw) return ''
    if (Array.isArray(raw)) return raw[0]?.name ?? ''
    return raw.name
  }
  function pickCategory(raw: Row['transaction_annotations']): string | null {
    if (!raw) return null
    if (Array.isArray(raw)) return raw[0]?.category ?? null
    return raw.category
  }

  const rows: Row[] = (byLabel ?? []) as unknown as Row[]

  const results: SearchResult[] = rows.map((r) => ({
    id: r.id,
    account_id: r.account_id,
    account_name: pickName(r.accounts),
    op_date: r.op_date,
    amount: Number(r.amount),
    raw_label: r.raw_label,
    category: pickCategory(r.transaction_annotations),
    monthSlug: r.op_date.slice(0, 7),
  }))

  return results
}
