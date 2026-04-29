import Link from 'next/link'
import { redirect } from 'next/navigation'
import { groupTransactionsByMonth } from '@/lib/months/format'
import { createClient } from '@/lib/supabase/server'

const amountFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, is_hybrid, created_at')
    .eq('id', id)
    .maybeSingle()

  if (!account) {
    redirect('/dashboard')
  }

  const { data: transactions } = await supabase
    .from('transactions')
    .select('op_date, amount')
    .eq('account_id', id)
    .order('op_date', { ascending: false })

  const months = groupTransactionsByMonth(transactions ?? [])

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-12">
      <header className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-sm text-neutral-500 transition hover:text-neutral-700"
        >
          ← Retour au dashboard
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

      <section className="mt-10 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
              {account.name}
            </h1>
            {account.is_hybrid ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                Pro / Perso
              </span>
            ) : null}
          </div>
        </div>

        <Link
          href={`/accounts/${account.id}/import`}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          Importer un relevé
        </Link>
      </section>

      <section className="mt-10">
        {months.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 px-6 py-12 text-center">
            <p className="text-base text-neutral-700">Aucune transaction pour ce compte.</p>
            <p className="mt-1 text-sm text-neutral-500">
              Importe ton premier relevé pour démarrer.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {months.map((m) => {
              const isPositive = m.score >= 0
              return (
                <li key={m.monthSlug}>
                  <Link
                    href={`/accounts/${account.id}/months/${m.monthSlug}`}
                    className="group flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 transition hover:border-neutral-300 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`inline-block h-3 w-3 rounded-full ${
                          isPositive ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                        aria-label={isPositive ? 'Solde positif' : 'Solde négatif'}
                      />
                      <div>
                        <p className="text-base font-medium text-neutral-900">{m.label}</p>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {m.count} transaction{m.count > 1 ? 's' : ''}
                          {m.unreconciled > 0 ? (
                            <>
                              {' · '}
                              <span className="font-medium text-amber-700">
                                {m.unreconciled} non lettrée{m.unreconciled > 1 ? 's' : ''}
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        isPositive ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {amountFormatter.format(m.score)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
