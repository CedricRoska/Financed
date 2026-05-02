'use client'

import Link from 'next/link'
import { useTransition, useState, useMemo } from 'react'
import { ArrowLeftIcon, LogOutIcon, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ThemeToggle } from '@/components/theme-toggle'
import { DEFAULT_CATEGORY_SUGGESTIONS } from '@/lib/categories/defaults'
import {
  resolveExpectedRefund,
  saveAnnotation,
  unresolveExpectedRefund,
} from '@/app/accounts/[id]/transactions/[tid]/edit/actions'

const amountFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
})

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const RESOLVE_KIND_LABEL: Record<string, string> = {
  cash: 'Reçu en liquide',
  wire: 'Reçu par virement',
  loss: 'Passé en perte',
}

export type AnnotationLite = {
  category: string | null
  comment: string | null
  pro_perso: 'pro' | 'perso' | null
  expected_refund_from: string | null
  expected_refund_label: string | null
  refund_resolved_at: string | null
  refund_resolved_kind: 'cash' | 'wire' | 'loss' | null
  refund_resolved_note: string | null
}

export type EnrichedTransaction = {
  id: string
  op_date: string
  amount: number
  raw_label: string
  annotation: AnnotationLite | null
  toProcess: boolean
}

type StatusFilter = 'all' | 'toProcess' | 'validated'

export function MonthClient({
  accountId,
  accountName,
  isHybrid,
  monthLabel,
  transactions,
}: {
  accountId: string
  accountName: string
  isHybrid: boolean
  monthLabel: string
  transactions: EnrichedTransaction[]
}) {
  const [selectedTx, setSelectedTx] = useState<EnrichedTransaction | null>(null)
  const [tab, setTab] = useState<'all' | 'pro' | 'perso'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (tab === 'pro' && t.annotation?.pro_perso !== 'pro') return false
      if (tab === 'perso' && t.annotation?.pro_perso !== 'perso') return false
      if (statusFilter === 'toProcess' && !t.toProcess) return false
      if (statusFilter === 'validated' && t.toProcess) return false
      if (search.trim() !== '') {
        const q = search.trim().toLowerCase()
        const matchLabel = t.raw_label.toLowerCase().includes(q)
        const matchCat = t.annotation?.category?.toLowerCase().includes(q)
        if (!matchLabel && !matchCat) return false
      }
      return true
    })
  }, [transactions, tab, statusFilter, search])

  const stats = useMemo(() => {
    const total = filtered.reduce((sum, t) => sum + t.amount, 0)
    const income = filtered.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
    const expenses = filtered.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
    const toProcess = filtered.filter((t) => t.toProcess).length
    return { total, income, expenses, toProcess, count: filtered.length }
  }, [filtered])

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await saveAnnotation(formData)
        toast.success('Annotation enregistrée')
      } catch {
        // Server Action redirige normalement, donc l'erreur est rare ici
        toast.error("Impossible d'enregistrer l'annotation")
      }
    })
  }

  function handleResolve(formData: FormData) {
    const kind = formData.get('kind')
    startTransition(async () => {
      try {
        await resolveExpectedRefund(formData)
        toast.success(
          kind === 'loss'
            ? 'Créance passée en perte'
            : kind === 'cash'
              ? 'Remboursement en liquide enregistré'
              : 'Remboursement par virement enregistré',
        )
      } catch {
        toast.error('Impossible de résoudre le remboursement')
      }
    })
  }

  function handleUnresolve(formData: FormData) {
    startTransition(async () => {
      try {
        await unresolveExpectedRefund(formData)
        toast.info('Résolution annulée — la créance est de nouveau en attente')
      } catch {
        toast.error("Impossible d'annuler la résolution")
      }
    })
  }

  const hasUnresolvedRefund =
    selectedTx?.annotation?.expected_refund_from &&
    !selectedTx?.annotation?.refund_resolved_at

  const hasResolvedRefund = Boolean(selectedTx?.annotation?.refund_resolved_at)

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <Link
          href={`/accounts/${accountId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          {accountName}
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form action="/logout" method="POST">
            <Button type="submit" variant="outline" size="sm">
              <LogOutIcon className="size-4" />
              Se déconnecter
            </Button>
          </form>
        </div>
      </header>

      {/* Title + stats */}
      <section className="border-b bg-muted/20 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{accountName}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{monthLabel}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-block h-3 w-3 rounded-full ${
                  stats.total >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                }`}
                aria-hidden
              />
              <span
                className={`text-3xl font-semibold tabular-nums ${
                  stats.total >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {amountFormatter.format(stats.total)}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Recettes</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-700">
                  {amountFormatter.format(stats.income)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Dépenses</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {amountFormatter.format(stats.expenses)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Transactions
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{stats.count}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">À traiter</p>
                <p
                  className={`mt-1 text-xl font-semibold tabular-nums ${
                    stats.toProcess > 0 ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {stats.toProcess}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          {isHybrid ? (
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'pro' | 'perso')}>
              <TabsList>
                <TabsTrigger value="all">Tout</TabsTrigger>
                <TabsTrigger value="pro">Pro</TabsTrigger>
                <TabsTrigger value="perso">Perso</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}

          <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
            {(['all', 'toProcess', 'validated'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  statusFilter === s
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s === 'all' ? 'Toutes' : s === 'toProcess' ? 'À traiter' : 'Validées'}
              </button>
            ))}
          </div>

          <div className="relative w-full max-w-xs sm:ml-auto">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher libellé ou catégorie…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </section>

      {/* Table */}
      <main className="flex-1 px-6 py-6">
        <div className="mx-auto flex max-w-7xl flex-col">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="px-6 py-16 text-center text-sm text-muted-foreground">
                Aucune transaction ne correspond à ces filtres.
              </CardContent>
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden">
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
                  {filtered.map((t) => {
                    const refundPending =
                      t.annotation?.expected_refund_from && !t.annotation?.refund_resolved_at
                    const refundResolved = Boolean(t.annotation?.refund_resolved_at)
                    return (
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
                            {refundPending ? (
                              <Badge
                                variant="outline"
                                className="border-amber-200 bg-amber-50 text-amber-800"
                              >
                                ↩ {t.annotation?.expected_refund_from} en attente
                              </Badge>
                            ) : null}
                            {refundResolved ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-emerald-50 text-emerald-700"
                              >
                                ✓{' '}
                                {t.annotation?.refund_resolved_kind === 'loss'
                                  ? 'Perdu'
                                  : t.annotation?.refund_resolved_kind === 'cash'
                                    ? 'Cash'
                                    : 'Remboursé'}
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
                          {t.toProcess ? (
                            <Badge
                              variant="outline"
                              className="border-amber-200 bg-amber-50 text-amber-700"
                            >
                              À traiter
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-emerald-200 bg-emerald-50 text-emerald-700"
                            >
                              Validée
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </main>

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
                    Si tu attends un remboursement, indique-le. La transaction restera à traiter
                    jusqu&apos;à ce que tu marques le remboursement résolu (étape suivante).
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

              {/* Section résolution remboursement */}
              {hasUnresolvedRefund || hasResolvedRefund ? (
                <>
                  <Separator />
                  <div className="px-4 py-4">
                    {hasUnresolvedRefund ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-medium text-amber-900">
                          Marquer le remboursement comme résolu
                        </p>
                        <p className="mt-1 text-xs text-amber-800">
                          {selectedTx.annotation?.expected_refund_from} doit te rembourser
                          {selectedTx.annotation?.expected_refund_label
                            ? ` pour « ${selectedTx.annotation.expected_refund_label} »`
                            : ''}
                          .
                        </p>
                        <form action={handleResolve} className="mt-3 flex flex-col gap-3">
                          <input type="hidden" name="transaction_id" value={selectedTx.id} />
                          <input type="hidden" name="account_id" value={accountId} />
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="resolve-note" className="text-xs text-amber-900">
                              Note <span className="text-amber-700">(optionnel)</span>
                            </Label>
                            <Input
                              id="resolve-note"
                              name="note"
                              maxLength={300}
                              placeholder="Ex. Reçu en main propre le 12/04"
                              className="bg-background"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="submit"
                              name="kind"
                              value="cash"
                              disabled={isPending}
                              variant="default"
                            >
                              Reçu en liquide
                            </Button>
                            <Button
                              type="submit"
                              name="kind"
                              value="wire"
                              disabled={isPending}
                              variant="default"
                            >
                              Reçu par virement
                            </Button>
                            <Button
                              type="submit"
                              name="kind"
                              value="loss"
                              disabled={isPending}
                              variant="outline"
                            >
                              Passer en perte
                            </Button>
                          </div>
                        </form>
                      </div>
                    ) : null}

                    {hasResolvedRefund ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-sm font-medium text-emerald-900">
                          Remboursement résolu ✓
                        </p>
                        <p className="mt-1 text-xs text-emerald-800">
                          {RESOLVE_KIND_LABEL[selectedTx.annotation?.refund_resolved_kind ?? 'cash']}
                          {selectedTx.annotation?.refund_resolved_at
                            ? ` · ${dateTimeFormatter.format(new Date(selectedTx.annotation.refund_resolved_at))}`
                            : ''}
                        </p>
                        {selectedTx.annotation?.refund_resolved_note ? (
                          <p className="mt-1 text-xs italic text-emerald-800">
                            « {selectedTx.annotation.refund_resolved_note} »
                          </p>
                        ) : null}
                        <form action={handleUnresolve} className="mt-3">
                          <input type="hidden" name="transaction_id" value={selectedTx.id} />
                          <input type="hidden" name="account_id" value={accountId} />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                          >
                            Annuler la résolution
                          </Button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
