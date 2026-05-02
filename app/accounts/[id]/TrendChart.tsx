'use client'

import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { formatMonthLabelFR } from '@/lib/months/format'

const amountFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const shortAmount = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
  notation: 'compact',
})

export type MonthlyTrendPoint = {
  monthSlug: string
  income: number
  expenses: number
  net: number
}

const chartConfig = {
  income: {
    label: 'Recettes',
    color: 'oklch(0.62 0.18 145)',
  },
  expenses: {
    label: 'Dépenses',
    color: 'oklch(0.62 0.18 25)',
  },
} satisfies ChartConfig

export function TrendChart({ trend }: { trend: MonthlyTrendPoint[] }) {
  const data = useMemo(
    () =>
      trend.map((p) => ({
        month: formatMonthLabelFR(p.monthSlug).split(' ')[0], // "Avril" only
        full: formatMonthLabelFR(p.monthSlug),
        income: Math.round(p.income),
        expenses: Math.round(Math.abs(p.expenses)),
        net: Math.round(p.net),
      })),
    [trend],
  )

  if (data.length === 0) return null

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Évolution mensuelle
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.length} mois · {amountFormatter.format(trend.reduce((s, p) => s + p.net, 0))}{' '}
              cumulé
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span
                className="size-3 rounded-sm"
                style={{ backgroundColor: 'oklch(0.62 0.18 145)' }}
              />
              Recettes
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="size-3 rounded-sm"
                style={{ backgroundColor: 'oklch(0.62 0.18 25)' }}
              />
              Dépenses
            </span>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              tickFormatter={(value: number) => shortAmount.format(value)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(_label, payload) => {
                    const item = payload?.[0]?.payload as { full?: string } | undefined
                    return item?.full ?? ''
                  }}
                  formatter={(value, name) => (
                    <div className="flex w-full justify-between gap-3">
                      <span className="text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                      </span>
                      <span className="font-medium tabular-nums">
                        {amountFormatter.format(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="income" fill="oklch(0.62 0.18 145)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="oklch(0.62 0.18 25)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
