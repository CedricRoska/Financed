import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { groupTransactionsByMonth } from '@/lib/months/format'
import { createClient } from '@/lib/supabase/server'

const amountFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

type AnnotationLite = {
  category: string | null
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
    .select('op_date, amount, transaction_annotations(category, expected_refund_from)')
    .eq('account_id', id)
    .order('op_date', { ascending: false })

  const enriched = (transactions ?? []).map((t) => {
    const annotation = pickAnnotation(t.transaction_annotations)
    return {
      op_date: t.op_date,
      amount: Number(t.amount),
      hasAnnotation: !isUnreconciled(annotation),
    }
  })

  const months = groupTransactionsByMonth(enriched)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground transition hover:text-foreground"
        >
          ← Retour au dashboard
        </Link>
        <form action="/logout" method="POST">
          <Button type="submit" variant="outline" size="sm">
            Se déconnecter
          </Button>
        </form>
      </header>

      <section className="flex flex-wrap items-end justify-between gap-4 border-b px-6 py-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{account.name}</h1>
            {account.is_hybrid ? (
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                Pro / Perso
              </Badge>
            ) : null}
          </div>
        </div>

        <Link href={`/accounts/${account.id}/import`} className={buttonVariants()}>
          Importer un relevé
        </Link>
      </section>

      <main className="flex-1 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
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
            months.map((m) => {
              const isPositive = m.score >= 0
              return (
                <Link key={m.monthSlug} href={`/accounts/${account.id}/months/${m.monthSlug}`}>
                  <Card className="transition hover:border-foreground/30 hover:shadow-sm">
                    <CardContent className="flex items-center justify-between p-5">
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
                            {m.unreconciled > 0 ? (
                              <>
                                {' · '}
                                <span className="font-medium text-amber-700">
                                  {m.unreconciled} non lettrée{m.unreconciled > 1 ? 's' : ''}
                                </span>
                              </>
                            ) : (
                              <>
                                {' · '}
                                <span className="font-medium text-emerald-700">Tout lettré</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-lg font-semibold tabular-nums ${
                          isPositive ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {amountFormatter.format(m.score)}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
