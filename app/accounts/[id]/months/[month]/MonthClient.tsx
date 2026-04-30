'use client'

import Link from 'next/link'
import { useTransition, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { DEFAULT_CATEGORY_SUGGESTIONS } from '@/lib/categories/defaults'
import { saveAnnotation } from '@/app/accounts/[id]/transactions/[tid]/edit/actions'

const amountFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
})

export type AnnotationLite = {
  category: string | null
  comment: string | null
  pro_perso: 'pro' | 'perso' | null
  expected_refund_from: string | null
  expected_refund_label: string | null
}

export type EnrichedTransaction = {
  id: string
  op_date: string
  amount: number
  raw_label: string
  annotation: AnnotationLite | null
  unreconciled: boolean
}

export function MonthClient({
  accountId,
  accountName,
  isHybrid,
  monthLabel,
  transactions,
  total,
  isPositive,
  unreconciledCount,
}: {
  accountId: string
  accountName: string
  isHybrid: boolean
  monthLabel: string
  transactions: EnrichedTransaction[]
  total: number
  isPositive: boolean
  unreconciledCount: number
}) {
  const [selectedTx, setSelectedTx] = useState<EnrichedTransaction | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await saveAnnotation(formData)
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link
          href={`/accounts/${accountId}`}
          className="text-sm text-muted-foreground transition hover:text-foreground"
        >
          ← Retour au compte
        </Link>
        <form action="/logout" method="POST">
          <Button type="submit" variant="outline" size="sm">
            Se déconnecter
          </Button>
        </form>
      </header>

      {/* Title row */}
      <section className="flex flex-wrap items-end justify-between gap-4 border-b px-6 py-6">
        <div>
          <p className="text-sm text-muted-foreground">{accountName}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{monthLabel}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm">
            {unreconciledCount > 0 ? (
              <span className="font-medium text-amber-700">
                {unreconciledCount} non lettrée{unreconciledCount > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="font-medium text-emerald-700">Tout lettré ✅</span>
            )}
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {transactions.length} transaction{transactions.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-3 w-3 rounded-full ${
              isPositive ? 'bg-emerald-500' : 'bg-red-500'
            }`}
            aria-label={isPositive ? 'Solde positif' : 'Solde négatif'}
          />
          <span
            className={`text-3xl font-semibold tabular-nums ${
              isPositive ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {amountFormatter.format(total)}
          </span>
        </div>
      </section>

      {/* Transactions table — full width */}
      <section className="flex-1 px-6 py-6">
        {transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 px-6 py-16 text-center text-sm text-muted-foreground">
            Aucune transaction pour ce mois.
          </div>
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="w-[140px]">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow
                    key={t.id}
                    onClick={() => setSelectedTx(t)}
                    className="cursor-pointer"
                  >
                    <TableCell className="text-muted-foreground">
                      {dateFormatter.format(new Date(t.op_date))}
                    </TableCell>
                    <TableCell className="font-medium">{t.raw_label}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {t.annotation?.category ? (
                          <Badge variant="secondary">{t.annotation.category}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {t.annotation?.pro_perso ? (
                          <Badge
                            variant="outline"
                            className={
                              t.annotation.pro_perso === 'pro'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-blue-200 bg-blue-50 text-blue-700'
                            }
                          >
                            {t.annotation.pro_perso === 'pro' ? 'Pro' : 'Perso'}
                          </Badge>
                        ) : null}
                        {t.annotation?.expected_refund_from ? (
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-amber-800"
                          >
                            ↩ {t.annotation.expected_refund_from}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        t.amount >= 0 ? 'font-medium text-emerald-700' : ''
                      }`}
                    >
                      {amountFormatter.format(t.amount)}
                    </TableCell>
                    <TableCell>
                      {t.unreconciled ? (
                        <Badge
                          variant="outline"
                          className="border-amber-200 bg-amber-50 text-amber-700"
                        >
                          Non lettrée
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-emerald-700"
                        >
                          Lettrée
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Sheet — édition transaction */}
      <Sheet open={selectedTx !== null} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selectedTx ? (
            <>
              <SheetHeader>
                <SheetTitle>Annoter la transaction</SheetTitle>
                <SheetDescription className="space-y-1">
                  <span className="block">
                    {dateFormatter.format(new Date(selectedTx.op_date))} · {selectedTx.raw_label}
                  </span>
                  <span
                    className={`block text-base font-semibold tabular-nums ${
                      selectedTx.amount >= 0 ? 'text-emerald-700' : 'text-foreground'
                    }`}
                  >
                    {amountFormatter.format(selectedTx.amount)}
                  </span>
                </SheetDescription>
              </SheetHeader>

              <form action={handleSubmit} className="flex flex-col gap-6 px-4 py-4">
                <input type="hidden" name="transaction_id" value={selectedTx.id} />
                <input type="hidden" name="account_id" value={accountId} />

                <div className="flex flex-col gap-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Input
                    id="category"
                    name="category"
                    list="category-suggestions"
                    maxLength={100}
                    defaultValue={selectedTx.annotation?.category ?? ''}
                    placeholder="Ex. Courses, Loyer, Salaire..."
                  />
                  <datalist id="category-suggestions">
                    {DEFAULT_CATEGORY_SUGGESTIONS.map((suggestion) => (
                      <option key={suggestion} value={suggestion} />
                    ))}
                  </datalist>
                </div>

                {isHybrid ? (
                  <div className="flex flex-col gap-2">
                    <Label>Pro ou perso ?</Label>
                    <RadioGroup
                      name="pro_perso"
                      defaultValue={selectedTx.annotation?.pro_perso ?? ''}
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="" id={`pp-none-${selectedTx.id}`} />
                        <Label
                          htmlFor={`pp-none-${selectedTx.id}`}
                          className="cursor-pointer font-normal"
                        >
                          Non classé
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="pro" id={`pp-pro-${selectedTx.id}`} />
                        <Label
                          htmlFor={`pp-pro-${selectedTx.id}`}
                          className="cursor-pointer font-normal"
                        >
                          Pro
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="perso" id={`pp-perso-${selectedTx.id}`} />
                        <Label
                          htmlFor={`pp-perso-${selectedTx.id}`}
                          className="cursor-pointer font-normal"
                        >
                          Perso
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                ) : null}

                <div className="flex flex-col gap-2">
                  <Label htmlFor="comment">
                    Commentaire <span className="text-muted-foreground">(optionnel)</span>
                  </Label>
                  <Textarea
                    id="comment"
                    name="comment"
                    maxLength={1000}
                    rows={3}
                    defaultValue={selectedTx.annotation?.comment ?? ''}
                  />
                </div>

                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm font-medium">Quelqu&apos;un me doit</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Si tu attends un remboursement, indique-le. La transaction restera comptée
                    comme non lettrée jusqu&apos;à réception.
                  </p>
                  <div className="mt-3 flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="expected_refund_from" className="text-xs">
                        Nom du débiteur
                      </Label>
                      <Input
                        id="expected_refund_from"
                        name="expected_refund_from"
                        maxLength={100}
                        defaultValue={selectedTx.annotation?.expected_refund_from ?? ''}
                        placeholder="Ex. Paul"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="expected_refund_label" className="text-xs">
                        Libellé du remboursement
                      </Label>
                      <Input
                        id="expected_refund_label"
                        name="expected_refund_label"
                        maxLength={200}
                        defaultValue={selectedTx.annotation?.expected_refund_label ?? ''}
                        placeholder="Ex. Bretagne 2026"
                      />
                    </div>
                  </div>
                </div>

                <SheetFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedTx(null)}
                  >
                    Annuler
                  </Button>
                </SheetFooter>
              </form>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
