'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { UploadIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendChart, type MonthlyTrendPoint } from './TrendChart'
import {
  groupTransactionsByMonth,
  monthSlugFromOpDate,
} from '@/lib/months/format'

const amountFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

export type AccountTransactionLite = {
  op_date: string
  amount: number
  hasAnnotation: boolean
  proPerso: 'pro' | 'perso' | null
}

export function AccountOverview({
  accountId,
  isHybrid,
  transactions,
}: {
  accountId: string
  isHybrid: boolean
  transactions: AccountTransactionLite[]
}) {
  const [tab, setTab] = useState<'all' | 'pro' | 'perso'>('all')

  const filtered = useMemo(() => {
    if (tab === 'all') return transactions
    if (tab === 'pro') return transactions.filter((t) => t.proPerso === 'pro')
    // Perso = défaut implicite (tout ce qui n'est pas explicitement pro)
    return transactions.filter((t) => t.proPerso !== 'pro')
  }, [transactions, tab])

  const totalBalance = useMemo(
    () => filtered.reduce((sum, t) => sum + t.amount, 0),
    [filtered],
  )
  const totalToProcess = useMemo(
    () => filtered.filter((t) => !t.hasAnnotation).length,
    [filtered],
  )
  const totalIncome = useMemo(
    () => filtered.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
    [filtered],
  )
  const totalExpenses = useMemo(
    () => filtered.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0),
    [filtered],
  )

  const months = useMemo(() => groupTransactionsByMonth(filtered), [filtered])

  const trend = useMemo<MonthlyTrendPoint[]>(() => {
    const trendMap = new Map<string, MonthlyTrendPoint>()
    for (const t of filtered) {
      const slug = monthSlugFromOpDate(t.op_date)
      const existing = trendMap.get(slug) ?? {
        monthSlug: slug,
        income: 0,
        expenses: 0,
        net: 0,
      }
      if (t.amount >= 0) existing.income += t.amount
      else existing.expenses += t.amount
      existing.net += t.amount
      trendMap.set(slug, existing)
    }
    return [...trendMap.values()].sort((a, b) => (a.monthSlug < b.monthSlug ? -1 : 1))
  }, [filtered])

  return (
    <>
      <section className="border-b bg-muted/20 px-6 py-8 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          {isHybrid ? (
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as 'all' | 'pro' | 'perso')}
            >
              <TabsList>
                <TabsTrigger value="all">Tout</TabsTrigger>
                <TabsTrigger value="pro">Pro</TabsTrigger>
                <TabsTrigger value="perso">Perso</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}

          {filtered.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>
      </section>

      <div className="px-6 py-8 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          {trend.length > 1 ? <TrendChart trend={trend} /> : null}

          <h2 className="text-lg font-semibold tracking-tight">Mois</h2>

          {months.length === 0 ? (
            <Card>
              <CardContent className="px-6 py-16 text-center">
                <UploadIcon className="mx-auto mb-3 size-10 text-muted-foreground" />
                <p className="text-base">
                  {tab === 'all'
                    ? 'Aucune transaction pour ce compte.'
                    : `Aucune transaction ${tab === 'pro' ? 'pro' : 'perso'} pour ce compte.`}
                </p>
                {tab === 'all' ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Importe ton premier relevé pour démarrer.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {months.map((m) => {
                const isPositive = m.score >= 0
                const validatedRatio =
                  m.count > 0 ? Math.round(((m.count - m.toProcess) / m.count) * 100) : 0
                return (
                  <Link
                    key={m.monthSlug}
                    href={`/accounts/${accountId}/months/${m.monthSlug}`}
                  >
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
      </div>
    </>
  )
}
