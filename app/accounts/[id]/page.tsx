import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { groupTransactionsByMonth } from '@/lib/months/format'
import { createClient } from '@/lib/supabase/server'
import { isTransactionValidated } from '@/lib/transactions/validation'

const amountFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

type AnnotationLite = {
  category: string | null
  expected_refund_from: string | null
  refund_resolved_at: string | null
}

function pickAnnotation(raw: unknown): AnnotationLite | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] ?? null) as AnnotationLite | null
  return raw as AnnotationLite
}

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
    .select(
      'op_date, amount, transaction_annotations(category, expected_refund_from, refund_resolved_at)',
    )
    .eq('account_id', id)
    .order('op_date', { ascending: false })

  const enriched = (transactions ?? []).map((t) => {
    const annotation = pickAnnotation(t.transaction_annotations)
    return {
      op_date: t.op_date,
      amount: Number(t.amount),
      hasAnnotation: isTransactionValidated(annotation),
    }
  })

  const months = groupTransactionsByMonth(enriched)

  const totalBalance = enriched.reduce((sum, t) => sum + t.amount, 0)
  const totalToProcess = enriched.filter((t) => !t.hasAnnotation).length
  const totalIncome = enriched.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = enriched.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground transition hover:text-foreground"
          >
            ← Dashboard
          </Link>
        </div>
        <form action="/logout" method="POST">
          <Button type="submit" variant="outline" size="sm">
            Se déconnecter
          </Button>
        </form>
      </header>

      <section className="border-b bg-muted/20 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">{account.name}</h1>
              {account.is_hybrid ? (
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  Pro / Perso
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {months.length} mois · {enriched.length} transaction{enriched.length > 1 ? 's' : ''}
            </p>
          </div>

          <Link
            href={`/accounts/${account.id}/import`}
            className={buttonVariants()}
          >
            Importer un relevé
          </Link>
        </div>

        {/* Stats row */}
        {enriched.length > 0 ? (
          <div className="mx-auto mt-8 grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Solde cumulé
                </p>
                <p
                  className={`mt-1 text-2xl font-semibold tabular-nums ${
                    totalBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {amountFormatter.format(totalBalance)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Recettes totales
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">
                  {amountFormatter.format(totalIncome)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Dépenses totales
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {amountFormatter.format(totalExpenses)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  À traiter
                </p>
                <p
                  className={`mt-1 text-2xl font-semibold tabular-nums ${
                    totalToProcess > 0 ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {totalToProcess}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>

      <main className="flex-1 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Mois</h2>

          {months.length === 0 ? (
            <Card>
              <CardContent className="px-6 py-16 text-center">
                <p className="text-base">Aucune transaction pour ce compte.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Importe ton premier relevé pour démarrer.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {months.map((m) => {
                const isPositive = m.score >= 0
                const validatedRatio =
                  m.count > 0 ? Math.round(((m.count - m.toProcess) / m.count) * 100) : 0
                return (
                  <Link key={m.monthSlug} href={`/accounts/${account.id}/months/${m.monthSlug}`}>
                    <Card className="transition hover:border-foreground/30 hover:shadow-sm">
                      <CardContent className="flex items-center justify-between gap-4 p-5">
                        <div className="flex items-center gap-4">
                          <span
                            className={`inline-block h-3 w-3 rounded-full ${
                              isPositive ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                            aria-label={isPositive ? 'Solde positif' : 'Solde négatif'}
                          />
                          <div>
                            <p className="text-base font-semibold">{m.label}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {m.count} transaction{m.count > 1 ? 's' : ''}
                              {m.toProcess > 0 ? (
                                <>
                                  {' · '}
                                  <span className="font-medium text-amber-700">
                                    {m.toProcess} à traiter
                                  </span>
                                </>
                              ) : (
                                <>
                                  {' · '}
                                  <span className="font-medium text-emerald-700">
                                    Tout validé
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="hidden items-center gap-4 sm:flex">
                          <div className="flex flex-col items-end">
                            <span className="text-xs uppercase tracking-wider text-muted-foreground">
                              Validé
                            </span>
                            <span className="text-sm font-medium tabular-nums">
                              {validatedRatio}%
                            </span>
                          </div>
                          <span
                            className={`text-lg font-semibold tabular-nums ${
                              isPositive ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            {amountFormatter.format(m.score)}
                          </span>
                        </div>
                        <span
                          className={`text-lg font-semibold tabular-nums sm:hidden ${
                            isPositive ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {amountFormatter.format(m.score)}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
