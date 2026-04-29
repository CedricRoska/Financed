import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatMonthLabelFR, parseMonthSlug } from '@/lib/months/format'
import { createClient } from '@/lib/supabase/server'

const amountFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
})

type AnnotationLite = {
  category: string | null
  pro_perso: 'pro' | 'perso' | null
  expected_refund_from: string | null
}

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
      'id, op_date, amount, raw_label, transaction_annotations(category, pro_perso, expected_refund_from)',
    )
    .eq('account_id', accountId)
    .gte('op_date', startDate)
    .lt('op_date', endDate)
    .order('op_date', { ascending: false })
    .order('id', { ascending: false })

  const enriched = (transactions ?? []).map((t) => {
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

  const total = enriched.reduce((sum, t) => sum + t.amount, 0)
  const isPositive = total >= 0
  const unreconciledCount = enriched.filter((t) => t.unreconciled).length

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-12">
      <header className="flex items-center justify-between">
        <Link
          href={`/accounts/${accountId}`}
          className="text-sm text-neutral-500 transition hover:text-neutral-700"
        >
          ← Retour au compte
        </Link>
        <form action="/logout" method="POST">
          <button
            type="submit"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Se déconnecter
          </button>
        </form>
      </header>

      <section className="mt-10 flex items-end justify-between">
        <div>
          <p className="text-sm text-neutral-500">{account.name}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900">
            {formatMonthLabelFR(monthSlug)}
          </h1>
          {unreconciledCount > 0 ? (
            <p className="mt-1 text-sm font-medium text-amber-700">
              {unreconciledCount} non lettrée{unreconciledCount > 1 ? 's' : ''}
            </p>
          ) : (
            <p className="mt-1 text-sm font-medium text-emerald-700">Tout lettré ✅</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-3 w-3 rounded-full ${
              isPositive ? 'bg-emerald-500' : 'bg-red-500'
            }`}
            aria-label={isPositive ? 'Solde positif' : 'Solde négatif'}
          />
          <span
            className={`text-2xl font-semibold tabular-nums ${
              isPositive ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {amountFormatter.format(total)}
          </span>
        </div>
      </section>

      <section className="mt-10">
        {enriched.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 px-6 py-12 text-center">
            <p className="text-sm text-neutral-500">Aucune transaction pour ce mois.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Libellé</th>
                  <th className="px-4 py-3 text-left font-medium">Catégorie</th>
                  <th className="px-4 py-3 text-right font-medium">Montant</th>
                  <th className="px-4 py-3 text-left font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {enriched.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 text-neutral-600">
                      {dateFormatter.format(new Date(t.op_date))}
                    </td>
                    <td className="px-4 py-3 text-neutral-900">
                      <Link
                        href={`/accounts/${accountId}/transactions/${t.id}/edit`}
                        className="hover:underline"
                      >
                        {t.raw_label}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {t.annotation?.category ? (
                        <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 ring-1 ring-neutral-200">
                          {t.annotation.category}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                      {t.annotation?.pro_perso ? (
                        <span
                          className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                            t.annotation.pro_perso === 'pro'
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                              : 'bg-blue-50 text-blue-700 ring-blue-200'
                          }`}
                        >
                          {t.annotation.pro_perso === 'pro' ? 'Pro' : 'Perso'}
                        </span>
                      ) : null}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${
                        t.amount >= 0 ? 'text-emerald-700' : 'text-neutral-900'
                      }`}
                    >
                      {amountFormatter.format(t.amount)}
                    </td>
                    <td className="px-4 py-3">
                      {t.unreconciled ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                          Non lettrée
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                          Lettrée
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
