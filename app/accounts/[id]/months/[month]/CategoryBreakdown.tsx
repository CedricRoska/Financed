'use client'

import { useMemo } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { EnrichedTransaction } from './MonthClient'

const amountFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const PIE_COLORS = [
  'oklch(0.55 0.18 250)',
  'oklch(0.62 0.20 30)',
  'oklch(0.58 0.18 145)',
  'oklch(0.65 0.18 60)',
  'oklch(0.60 0.18 320)',
  'oklch(0.55 0.18 200)',
  'oklch(0.65 0.20 0)',
  'oklch(0.55 0.18 100)',
]

export function CategoryBreakdown({ transactions }: { transactions: EnrichedTransaction[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (t.amount >= 0) continue // on regarde uniquement les dépenses
      const cat = t.annotation?.category?.trim() || 'Non catégorisée'
      map.set(cat, (map.get(cat) ?? 0) + Math.abs(t.amount))
    }
    return [...map.entries()]
      .map(([category, amount], index) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        fill: PIE_COLORS[index % PIE_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [transactions])

  const totalExpenses = useMemo(
    () => data.reduce((sum, d) => sum + d.amount, 0),
    [data],
  )

  if (data.length === 0) {
    return null
  }

  const chartConfig: ChartConfig = data.reduce((acc, item) => {
    acc[item.category] = { label: item.category, color: item.fill }
    return acc
  }, {} as ChartConfig)

  // Top 5 + reste agrégé pour un pie pas surchargé
  const top5 = data.slice(0, 5)
  const rest = data.slice(5)
  const restAmount = rest.reduce((sum, d) => sum + d.amount, 0)
  const pieData =
    rest.length > 0
      ? [...top5, { category: 'Autres', amount: restAmount, fill: 'oklch(0.65 0 0)' }]
      : top5

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center">
        <div className="flex-1">
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Décomposition des dépenses
          </h3>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {amountFormatter.format(totalExpenses)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.length} catégorie{data.length > 1 ? 's' : ''} · Top 5 affichées
          </p>

          <ul className="mt-4 flex flex-col gap-2">
            {data.slice(0, 8).map((d) => {
              const pct = totalExpenses > 0 ? Math.round((d.amount / totalExpenses) * 100) : 0
              return (
                <li key={d.category} className="flex items-center gap-3 text-sm">
                  <span
                    className="size-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: d.fill }}
                    aria-hidden
                  />
                  <span className="flex-1 truncate">{d.category}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
                  <span className="w-20 text-right tabular-nums">
                    {amountFormatter.format(d.amount)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex h-64 w-full max-w-sm items-center justify-center">
          <ChartContainer config={chartConfig} className="aspect-square h-full">
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, name) => (
                      <div className="flex w-full justify-between gap-3">
                        <span className="text-muted-foreground">{name as string}</span>
                        <span className="font-medium tabular-nums">
                          {amountFormatter.format(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Pie
                data={pieData}
                dataKey="amount"
                nameKey="category"
                innerRadius={60}
                outerRadius={100}
                strokeWidth={2}
                stroke="var(--background)"
              >
                {pieData.map((entry) => (
                  <Cell key={entry.category} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
