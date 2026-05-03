'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useTransition, useState, useMemo, useRef } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, SearchIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Switch } from '@/components/ui/switch'
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
import { cn } from '@/lib/utils'
import { CategoryBreakdown } from './CategoryBreakdown'
import { bulkApplyAnnotation, bulkLettrage } from './bulk-actions'
import { CategoryCombobox } from '@/components/category-combobox'
import { activateHybrid } from '@/app/accounts/[id]/actions'
import {
  deleteCategory,
  deleteSubcategory,
  renameCategory,
  renameSubcategory,
} from '@/app/settings/categories-actions'
import {
  resolveExpectedRefund,
  saveAnnotation,
  unresolveExpectedRefund,
} from '@/app/accounts/[id]/transactions/[tid]/edit/actions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
  subcategory: string | null
  comment: string | null
  pro_perso: 'pro' | 'perso' | null
  expected_refund_from: string | null
  expected_refund_label: string | null
  refund_resolved_at: string | null
  refund_resolved_kind: 'cash' | 'wire' | 'loss' | null
  refund_resolved_note: string | null
  to_investigate: boolean
}

export type EnrichedTransaction = {
  id: string
  op_date: string
  amount: number
  raw_label: string
  bank_op_type: string | null
  bank_category: string | null
  bank_subcategory: string | null
  annotation: AnnotationLite | null
  toProcess: boolean
}

type StatusFilter = 'all' | 'toProcess' | 'investigate' | 'validated'

export type UserCategoryWithSubs = {
  name: string
  count: number
  subcategories: { name: string; count: number }[]
}

export function MonthClient({
  accountId,
  accountName,
  isHybrid,
  monthLabel,
  transactions,
  userCategories,
}: {
  accountId: string
  accountName: string
  isHybrid: boolean
  monthLabel: string
  transactions: EnrichedTransaction[]
  userCategories: UserCategoryWithSubs[]
}) {
  const router = useRouter()
  const [selectedTx, setSelectedTx] = useState<EnrichedTransaction | null>(null)
  const [tab, setTab] = useState<'all' | 'pro' | 'perso'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastClickedId, setLastClickedId] = useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkSubcategory, setBulkSubcategory] = useState('')
  const [bulkProPerso, setBulkProPerso] = useState<'pro' | 'perso' | ''>('')
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const focusedRowRef = useRef<HTMLTableRowElement | null>(null)
  // Confirmation hybride : stocke les data du formulaire en attente quand l'utilisateur
  // tente de classer Pro/Perso sur un compte non-hybride
  const [hybridConfirm, setHybridConfirm] = useState<
    | { kind: 'single'; formData: FormData; advance: boolean }
    | { kind: 'bulk' }
    | null
  >(null)
  // State du formulaire (controlled) pour piloter la Combobox
  const [categoryDraft, setCategoryDraft] = useState<string>('')
  const [subcategoryDraft, setSubcategoryDraft] = useState<string>('')
  const [investigateDraft, setInvestigateDraft] = useState<boolean>(false)

  // Reset les drafts quand on ouvre une autre transaction.
  // Si la transaction n'est pas encore annotée, on pré-remplit avec la
  // classification BP brute (suggestion). L'utilisateur reste libre de modifier.
  useEffect(() => {
    if (!selectedTx) return
    const isFlaggedToInvestigate = selectedTx.annotation?.to_investigate ?? false
    if (isFlaggedToInvestigate) {
      setCategoryDraft('')
      setSubcategoryDraft('')
    } else {
      const hasUserAnnotation = Boolean(
        selectedTx.annotation?.category || selectedTx.annotation?.subcategory,
      )
      if (hasUserAnnotation) {
        setCategoryDraft(selectedTx.annotation?.category ?? '')
        setSubcategoryDraft(selectedTx.annotation?.subcategory ?? '')
      } else {
        setCategoryDraft(selectedTx.bank_category ?? '')
        setSubcategoryDraft(selectedTx.bank_subcategory ?? '')
      }
    }
    setInvestigateDraft(isFlaggedToInvestigate)
  }, [
    selectedTx,
    selectedTx?.id,
    selectedTx?.annotation?.category,
    selectedTx?.annotation?.subcategory,
    selectedTx?.annotation?.to_investigate,
    selectedTx?.bank_category,
    selectedTx?.bank_subcategory,
  ])
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (tab === 'pro' && t.annotation?.pro_perso !== 'pro') return false
      if (tab === 'perso' && t.annotation?.pro_perso === 'pro') return false
      if (statusFilter === 'toProcess' && !t.toProcess) return false
      if (statusFilter === 'investigate' && !t.annotation?.to_investigate) return false
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

  // Items pour la Combobox catégorie (avec counts)
  const categoryItems = useMemo(
    () => userCategories.map((c) => ({ name: c.name, count: c.count })),
    [userCategories],
  )

  // Items pour la Combobox sous-catégorie, filtrés par catégorie sélectionnée
  const subcategoryItems = useMemo(() => {
    const cat = userCategories.find((c) => c.name === categoryDraft)
    return cat ? cat.subcategories : []
  }, [userCategories, categoryDraft])

  // Items pour le bulk dialog (toutes les catégories quel que soit le draft)
  const bulkCategoryItems = useMemo(
    () => userCategories.map((c) => ({ name: c.name, count: c.count })),
    [userCategories],
  )

  // Helpers Server Actions wrapping (FormData → direct args)
  async function handleRenameCategoryWrapper(oldName: string, newName: string) {
    const fd = new FormData()
    fd.set('old_name', oldName)
    fd.set('new_name', newName)
    await renameCategory(fd)
    router.refresh()
  }

  async function handleDeleteCategoryWrapper(name: string) {
    const fd = new FormData()
    fd.set('name', name)
    await deleteCategory(fd)
    router.refresh()
  }

  async function handleRenameSubWrapper(oldName: string, newName: string) {
    if (!categoryDraft) throw new Error('Pas de catégorie parente')
    await renameSubcategory(categoryDraft, oldName, newName)
    router.refresh()
  }

  async function handleDeleteSubWrapper(name: string) {
    if (!categoryDraft) throw new Error('Pas de catégorie parente')
    await deleteSubcategory(categoryDraft, name)
    router.refresh()
  }

  // Gère Shift+Click pour sélection en intervalle, click simple pour ouvrir Sheet
  function handleRowClick(t: EnrichedTransaction, e: React.MouseEvent) {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault()
      const next = new Set(selectedIds)

      if (e.shiftKey && lastClickedId && lastClickedId !== t.id) {
        // Range select dans la liste filtrée actuelle
        const startIdx = filtered.findIndex((row) => row.id === lastClickedId)
        const endIdx = filtered.findIndex((row) => row.id === t.id)
        if (startIdx !== -1 && endIdx !== -1) {
          const [a, b] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
          for (let i = a; i <= b; i++) {
            const row = filtered[i]
            if (row) next.add(row.id)
          }
        }
      } else {
        // Cmd/Ctrl+Click ou Shift+Click sans précédent : toggle individuel
        if (next.has(t.id)) next.delete(t.id)
        else next.add(t.id)
      }

      setSelectedIds(next)
      setLastClickedId(t.id)
      return
    }

    // Click simple : ouvre la Sheet d'édition
    setSelectedTx(t)
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setLastClickedId(null)
  }

  function selectAll() {
    setSelectedIds(new Set(filtered.map((t) => t.id)))
  }

  // Keyboard navigation : J/K/flèches/Enter/Esc quand la Sheet et les Dialogs sont fermés
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (selectedTx !== null || bulkOpen) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      const key = e.key
      const lowerKey = key.toLowerCase()

      if (key === 'ArrowDown' || lowerKey === 'j') {
        if (filtered.length === 0) return
        e.preventDefault()
        setFocusedIndex((prev) =>
          prev === null ? 0 : Math.min(prev + 1, filtered.length - 1),
        )
      } else if (key === 'ArrowUp' || lowerKey === 'k') {
        if (filtered.length === 0) return
        e.preventDefault()
        setFocusedIndex((prev) => (prev === null ? 0 : Math.max(prev - 1, 0)))
      } else if (key === 'Enter') {
        if (focusedIndex === null) return
        const row = filtered[focusedIndex]
        if (row) {
          e.preventDefault()
          setSelectedTx(row)
        }
      } else if (key === 'Escape') {
        if (focusedIndex !== null || selectedIds.size > 0) {
          e.preventDefault()
          setFocusedIndex(null)
          if (selectedIds.size > 0) {
            setSelectedIds(new Set())
            setLastClickedId(null)
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [filtered, focusedIndex, selectedTx, bulkOpen, selectedIds.size])

  // Scroll la ligne focusée dans la vue
  useEffect(() => {
    if (focusedRowRef.current) {
      focusedRowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [focusedIndex])

  // Reset focus quand les filtres changent
  useEffect(() => {
    setFocusedIndex(null)
  }, [tab, statusFilter, search])

  function performBulkApply() {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    const trimmedCategory = bulkCategory.trim()
    const trimmedSubcategory = bulkSubcategory.trim()
    const proPersoValue = bulkProPerso === '' ? undefined : bulkProPerso

    startTransition(async () => {
      try {
        const result = await bulkApplyAnnotation({
          transactionIds: ids,
          accountId,
          ...(trimmedCategory !== '' ? { category: trimmedCategory } : {}),
          ...(trimmedCategory !== '' && trimmedSubcategory !== ''
            ? { subcategory: trimmedSubcategory }
            : {}),
          ...(proPersoValue !== undefined ? { proPerso: proPersoValue } : {}),
        })
        toast.success(`${result.updated} transaction${result.updated > 1 ? 's' : ''} mises à jour`)
        clearSelection()
        setBulkOpen(false)
        setBulkCategory('')
        setBulkSubcategory('')
        setBulkProPerso('')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erreur bulk update')
      }
    })
  }

  function handleBulkApply() {
    // Seul le passage en Pro déclenche l'activation hybride. Perso = défaut implicite.
    if (!isHybrid && bulkProPerso === 'pro') {
      setHybridConfirm({ kind: 'bulk' })
      return
    }
    performBulkApply()
  }

  // Sélection courante côté client : permet de détecter les +/- pour le lettrage.
  const selectedTxs = useMemo(
    () => transactions.filter((t) => selectedIds.has(t.id)),
    [transactions, selectedIds],
  )
  const selectedPositives = useMemo(
    () => selectedTxs.filter((t) => t.amount > 0),
    [selectedTxs],
  )
  const selectedNegatives = useMemo(
    () => selectedTxs.filter((t) => t.amount < 0),
    [selectedTxs],
  )
  const canLettrer =
    selectedPositives.length === 1 && selectedNegatives.length >= 1

  function handleBulkLettrage() {
    if (!canLettrer) return
    const refundTx = selectedPositives[0]!
    const expenseTxIds = selectedNegatives.map((t) => t.id)
    startTransition(async () => {
      try {
        const result = await bulkLettrage({
          expenseTxIds,
          refundTxId: refundTx.id,
          accountId,
        })
        toast.success(
          `${result.lettered} dépense${result.lettered > 1 ? 's' : ''} lettrée${result.lettered > 1 ? 's' : ''}`,
        )
        clearSelection()
        setBulkOpen(false)
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erreur lettrage')
      }
    })
  }

  function confirmHybridForBulk() {
    startTransition(async () => {
      try {
        await activateHybrid(accountId)
        toast.success('Mode hybride activé sur ce compte')
        router.refresh()
        setHybridConfirm(null)
        performBulkApply()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Impossible d'activer l'hybride")
      }
    })
  }

  const stats = useMemo(() => {
    const total = filtered.reduce((sum, t) => sum + t.amount, 0)
    const income = filtered.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
    const expenses = filtered.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
    const toProcess = filtered.filter((t) => t.toProcess).length
    return { total, income, expenses, toProcess, count: filtered.length }
  }, [filtered])

  function advanceToNextOrClose() {
    if (!selectedTx) return
    const currentIdx = filtered.findIndex((t) => t.id === selectedTx.id)
    const nextIdx = currentIdx + 1
    if (nextIdx >= 0 && nextIdx < filtered.length) {
      const nextRow = filtered[nextIdx]
      if (nextRow) {
        setSelectedTx(nextRow)
        setFocusedIndex(nextIdx)
        return
      }
    }
    setSelectedTx(null)
    toast.info("C'était la dernière transaction du mois !")
  }

  function performSave(formData: FormData, advance: boolean) {
    startTransition(async () => {
      try {
        await saveAnnotation(formData)
        toast.success('Annotation enregistrée')
        router.refresh()
        if (advance) {
          advanceToNextOrClose()
        } else {
          setSelectedTx(null)
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Impossible d'enregistrer")
      }
    })
  }

  function handleSubmit(formData: FormData, advance: boolean = false) {
    // Seul le passage en Pro déclenche l'activation hybride. Perso = défaut implicite.
    if (!isHybrid && formData.get('pro_perso') === 'pro') {
      setHybridConfirm({ kind: 'single', formData, advance })
      return
    }

    performSave(formData, advance)
  }

  function confirmHybridActivation() {
    if (!hybridConfirm) return
    startTransition(async () => {
      try {
        await activateHybrid(accountId)
        toast.success('Mode hybride activé sur ce compte')
        router.refresh()
        if (hybridConfirm.kind === 'single') {
          performSave(hybridConfirm.formData, hybridConfirm.advance)
        } else {
          // bulk : on reposera la question via l'UI bulk dialog
        }
        setHybridConfirm(null)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Impossible d'activer l'hybride")
      }
    })
  }

  function cancelHybridActivation() {
    setHybridConfirm(null)
    toast.info("Activation annulée — la transaction n'a pas été modifiée")
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
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Impossible de résoudre')
      }
    })
  }

  function handleUnresolve(formData: FormData) {
    startTransition(async () => {
      try {
        await unresolveExpectedRefund(formData)
        toast.info('Résolution annulée — la créance est de nouveau en attente')
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Impossible d'annuler")
      }
    })
  }

  const hasUnresolvedRefund =
    selectedTx?.annotation?.expected_refund_from &&
    !selectedTx?.annotation?.refund_resolved_at

  const hasResolvedRefund = Boolean(selectedTx?.annotation?.refund_resolved_at)

  return (
    <div className="flex flex-col">
      {/* Title + stats */}
      <section className="border-b bg-muted/20 px-6 py-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link
                href={`/accounts/${accountId}`}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
              >
                <ArrowLeftIcon className="size-3" />
                {accountName}
              </Link>
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
      <section className="border-b bg-background px-6 py-4 lg:px-10">
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
            {(['all', 'toProcess', 'investigate', 'validated'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  statusFilter === s
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s === 'all'
                  ? 'Toutes'
                  : s === 'toProcess'
                    ? 'À traiter'
                    : s === 'investigate'
                      ? 'À investiguer'
                      : 'Validées'}
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

      {/* Category breakdown chart */}
      <section className="px-6 py-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <CategoryBreakdown transactions={filtered} />
        </div>
      </section>

      {/* Hint clavier */}
      <div className="mx-auto -mt-2 mb-2 hidden max-w-7xl flex-wrap gap-x-4 gap-y-1 px-6 text-xs text-muted-foreground lg:flex lg:px-10">
        <span>
          💡 <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">J/K</kbd> ou{' '}
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">↑↓</kbd> pour naviguer
        </span>
        <span>
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Enter</kbd> pour ouvrir
        </span>
        <span>
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Shift+clic</kbd> pour une plage
        </span>
        <span>
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">⌘ clic</kbd> pour ajouter
        </span>
      </div>

      {/* Table */}
      <main className="flex-1 px-6 pb-32 lg:px-10">
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
                    <TableHead className="w-[130px]">Type</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="w-[140px]">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t, idx) => {
                    const refundPending =
                      t.annotation?.expected_refund_from && !t.annotation?.refund_resolved_at
                    const refundResolved = Boolean(t.annotation?.refund_resolved_at)
                    const isSelected = selectedIds.has(t.id)
                    const isValidated = !t.toProcess
                    const isFocused = focusedIndex === idx
                    return (
                      <TableRow
                        key={t.id}
                        ref={isFocused ? focusedRowRef : undefined}
                        onClick={(e) => {
                          handleRowClick(t, e)
                          setFocusedIndex(idx)
                        }}
                        data-selected={isSelected ? 'true' : undefined}
                        className={cn(
                          'cursor-pointer select-none border-l-2 transition',
                          isFocused && 'outline outline-2 outline-primary outline-offset-[-2px]',
                          isSelected
                            ? 'border-l-foreground bg-muted/60'
                            : isValidated
                              ? 'border-l-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/10'
                              : 'border-l-transparent',
                        )}
                      >
                        <TableCell className="text-muted-foreground">
                          {dateFormatter.format(new Date(t.op_date))}
                        </TableCell>
                        <TableCell className="font-medium">{t.raw_label}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {t.bank_op_type ?? '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {t.annotation?.category ? (
                              <Badge variant="secondary">
                                {t.annotation.category}
                                {t.annotation.subcategory ? (
                                  <span className="ml-1 font-normal text-muted-foreground">
                                    / {t.annotation.subcategory}
                                  </span>
                                ) : null}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                            {t.annotation?.pro_perso === 'pro' ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-emerald-50 text-emerald-700"
                              >
                                Pro
                              </Badge>
                            ) : null}
                            {t.annotation?.to_investigate ? (
                              <Badge
                                variant="outline"
                                className="border-orange-300 bg-orange-50 text-orange-800"
                              >
                                🔍 À investiguer
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

              <form
                action={(formData) => handleSubmit(formData, false)}
                id="annotation-form"
                className="flex flex-col gap-6 px-4 py-4"
              >
                <input type="hidden" name="transaction_id" value={selectedTx.id} />
                <input type="hidden" name="account_id" value={accountId} />

                <input type="hidden" name="category" value={categoryDraft} />
                <input type="hidden" name="subcategory" value={subcategoryDraft} />
                <input
                  type="hidden"
                  name="to_investigate"
                  value={investigateDraft ? '1' : '0'}
                />

                <div
                  className={cn(
                    'flex items-start justify-between gap-3 rounded-lg border px-3 py-3 transition',
                    investigateDraft
                      ? 'border-orange-300 bg-orange-50/60'
                      : 'border-dashed bg-muted/20',
                  )}
                >
                  <div className="flex flex-col gap-0.5">
                    <Label
                      htmlFor={`investigate-${selectedTx.id}`}
                      className="cursor-pointer text-sm font-medium"
                    >
                      🔍 À investiguer
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      Marque cette transaction si tu ne sais pas encore comment la classer
                    </span>
                  </div>
                  <Switch
                    id={`investigate-${selectedTx.id}`}
                    checked={investigateDraft}
                    onCheckedChange={(checked) => {
                      setInvestigateDraft(checked)
                      if (checked) {
                        setCategoryDraft('')
                        setSubcategoryDraft('')
                      }
                    }}
                  />
                </div>

                {selectedTx.bank_category || selectedTx.bank_op_type ? (
                  <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    💡 <span className="font-medium">Classification banque :</span>{' '}
                    {selectedTx.bank_op_type ? (
                      <span className="rounded bg-background px-1.5 py-0.5 font-mono">
                        {selectedTx.bank_op_type}
                      </span>
                    ) : null}
                    {selectedTx.bank_category ? (
                      <>
                        {' · '}
                        <span className="rounded bg-background px-1.5 py-0.5 font-mono">
                          {selectedTx.bank_category}
                        </span>
                      </>
                    ) : null}
                    {selectedTx.bank_subcategory ? (
                      <>
                        {' / '}
                        <span className="rounded bg-background px-1.5 py-0.5 font-mono">
                          {selectedTx.bank_subcategory}
                        </span>
                      </>
                    ) : null}
                  </div>
                ) : null}

                <CategoryCombobox
                  label="Catégorie"
                  value={categoryDraft}
                  items={categoryItems}
                  onChange={(v) => {
                    setCategoryDraft(v)
                    if (v !== categoryDraft) setSubcategoryDraft('')
                  }}
                  onRename={handleRenameCategoryWrapper}
                  onDelete={handleDeleteCategoryWrapper}
                  placeholder={
                    investigateDraft
                      ? 'Désactive « À investiguer » pour catégoriser'
                      : 'Ex. Abonnements, Courses, Loyer…'
                  }
                  disabled={investigateDraft}
                />

                <CategoryCombobox
                  label="Sous-catégorie"
                  value={subcategoryDraft}
                  items={subcategoryItems}
                  onChange={setSubcategoryDraft}
                  onRename={handleRenameSubWrapper}
                  onDelete={handleDeleteSubWrapper}
                  placeholder={
                    investigateDraft
                      ? 'Désactive « À investiguer » d\'abord'
                      : categoryDraft
                        ? `Ex. Claude, Spotify… (sous "${categoryDraft}")`
                        : 'Sélectionne d\'abord une catégorie'
                  }
                  disabled={investigateDraft || !categoryDraft}
                  hint={
                    !investigateDraft && !categoryDraft ? (
                      <span className="text-xs text-muted-foreground">
                        Choisis une catégorie d&apos;abord
                      </span>
                    ) : null
                  }
                />

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Pro ou perso ?</Label>
                    {!isHybrid ? (
                      <span className="text-xs text-muted-foreground">
                        Activera le mode hybride
                      </span>
                    ) : null}
                  </div>
                  <RadioGroup
                    name="pro_perso"
                    defaultValue={selectedTx.annotation?.pro_perso === 'pro' ? 'pro' : 'perso'}
                    className="flex gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="perso" id={`pp-perso-${selectedTx.id}`} />
                      <Label
                        htmlFor={`pp-perso-${selectedTx.id}`}
                        className="cursor-pointer font-normal"
                      >
                        Perso
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
                  </RadioGroup>
                </div>

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

                <SheetFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedTx(null)}
                    className="sm:order-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={isPending}
                    className="sm:order-2"
                  >
                    {isPending ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                  <Button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      const form = document.getElementById(
                        'annotation-form',
                      ) as HTMLFormElement | null
                      if (form) {
                        const formData = new FormData(form)
                        handleSubmit(formData, true)
                      }
                    }}
                    className="sm:order-3"
                  >
                    {isPending ? 'Enregistrement…' : 'Suivante'}
                    <ArrowRightIcon className="size-4" />
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

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 ? (
        <div className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-6">
          <div className="flex items-center gap-3 rounded-xl border bg-background px-4 py-2.5 shadow-lg">
            <span className="text-sm font-medium">
              {selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''}
            </span>
            <Separator orientation="vertical" className="h-6" />
            <Button size="sm" onClick={() => setBulkOpen(true)}>
              <CheckIcon className="size-4" />
              Catégoriser ensemble
            </Button>
            <Button size="sm" variant="ghost" onClick={selectAll}>
              Tout sélectionner ({filtered.length})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearSelection}
              aria-label="Annuler la sélection"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Confirmation activation hybride */}
      <AlertDialog
        open={hybridConfirm !== null}
        onOpenChange={(open) => {
          if (!open) cancelHybridActivation()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activer le mode hybride pro / perso ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce compte n&apos;est pas encore configuré en mode hybride. Tu vas pouvoir
              classer chaque transaction comme <strong>Pro</strong> ou{' '}
              <strong>Perso</strong>, et basculer entre les deux vues depuis l&apos;onglet en
              haut du mois.
              <br />
              <br />
              Tu peux le désactiver plus tard depuis les paramètres du compte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (hybridConfirm?.kind === 'single') {
                  confirmHybridActivation()
                } else if (hybridConfirm?.kind === 'bulk') {
                  confirmHybridForBulk()
                }
              }}
              disabled={isPending}
            >
              {isPending ? 'Activation…' : 'Activer et enregistrer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk apply dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Catégoriser {selectedIds.size} transaction{selectedIds.size > 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              La catégorie et le pro/perso seront appliqués aux lignes sélectionnées. Les
              autres champs (commentaire, remboursement attendu) restent inchangés.
            </DialogDescription>
          </DialogHeader>

          {canLettrer ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <span className="text-base">🔗</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">
                    Lettrage automatique disponible
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    Ta sélection contient 1 entrée de{' '}
                    <span className="font-semibold">
                      {amountFormatter.format(selectedPositives[0]!.amount)}
                    </span>{' '}
                    («&nbsp;{selectedPositives[0]!.raw_label}&nbsp;») et{' '}
                    {selectedNegatives.length} dépense{selectedNegatives.length > 1 ? 's' : ''}.
                    Veux-tu marquer{' '}
                    {selectedNegatives.length > 1 ? 'ces dépenses' : 'cette dépense'} comme
                    remboursée{selectedNegatives.length > 1 ? 's' : ''} par cette entrée&nbsp;?
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-3"
                    onClick={handleBulkLettrage}
                    disabled={isPending}
                  >
                    {isPending
                      ? 'Lettrage…'
                      : `Lettrer ${selectedNegatives.length} dépense${selectedNegatives.length > 1 ? 's' : ''}`}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-4">
            <CategoryCombobox
              label="Catégorie"
              value={bulkCategory}
              items={bulkCategoryItems}
              onChange={(v) => {
                setBulkCategory(v)
                if (v !== bulkCategory) setBulkSubcategory('')
              }}
              onRename={handleRenameCategoryWrapper}
              onDelete={handleDeleteCategoryWrapper}
              placeholder="Ex. Abonnements"
              hint={
                <span className="text-xs text-muted-foreground">
                  Vide = ne pas modifier
                </span>
              }
            />

            <CategoryCombobox
              label="Sous-catégorie"
              value={bulkSubcategory}
              items={
                userCategories.find((c) => c.name === bulkCategory)?.subcategories ?? []
              }
              onChange={setBulkSubcategory}
              placeholder={
                bulkCategory
                  ? `Ex. Claude (sous "${bulkCategory}")`
                  : "Choisis d'abord une catégorie"
              }
              disabled={!bulkCategory}
            />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Pro / Perso</Label>
                {!isHybrid ? (
                  <span className="text-xs text-muted-foreground">
                    Activera le mode hybride
                  </span>
                ) : null}
              </div>
              <RadioGroup
                value={bulkProPerso}
                onValueChange={(v) => setBulkProPerso(v as 'pro' | 'perso' | '')}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="perso" id="bulk-perso" />
                  <Label htmlFor="bulk-perso" className="cursor-pointer font-normal">
                    Perso
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="pro" id="bulk-pro" />
                  <Label htmlFor="bulk-pro" className="cursor-pointer font-normal">
                    Pro
                  </Label>
                </div>
                {bulkProPerso !== '' ? (
                  <button
                    type="button"
                    onClick={() => setBulkProPerso('')}
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Effacer
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Vide = ne pas modifier
                  </span>
                )}
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleBulkApply}
              disabled={
                isPending ||
                (bulkCategory.trim() === '' && bulkProPerso === '')
              }
            >
              {isPending
                ? 'Application…'
                : `Appliquer à ${selectedIds.size} ligne${selectedIds.size > 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
