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

  // Fenêtre du mois : [YYYY-MM-01, premier jour du mois suivant)
  const startDate = `${monthSlug}-01`
  const nextMonth = parsed.month === 12 ? 1 : parsed.month + 1
  const nextYear = parsed.month === 12 ? parsed.year + 1 : parsed.year
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, op_date, amount, raw_label')
    .eq('account_id', accountId)
    .gte('op_date', startDate)
    .lt('op_date', endDate)
    .order('op_date', { ascending: false })
    .order('id', { ascending: false })

  const total = (transactions ?? []).reduce((sum, t) => sum + Number(t.amount), 0)
  const isPositive = total >= 0

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
        {!transactions || transactions.length === 0 ? (
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
                  <th className="px-4 py-3 text-right font-medium">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 text-neutral-600">
                      {dateFormatter.format(new Date(t.op_date))}
                    </td>
                    <td className="px-4 py-3 text-neutral-900">{t.raw_label}</td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${
                        Number(t.amount) >= 0 ? 'text-emerald-700' : 'text-neutral-900'
                      }`}
                    >
                      {amountFormatter.format(Number(t.amount))}
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
