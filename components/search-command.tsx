'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { CreditCardIcon, SearchIcon } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { searchTransactions, type SearchResult } from '@/app/search/actions'

const amountFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: '2-digit',
})

/**
 * Palette de recherche cross-historique.
 * Ouverte par Cmd+K (ou Ctrl+K) ou par click sur le bouton de recherche dans la sidebar.
 */
export function SearchCommand() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((current) => !current)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Debounce search (200ms)
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const r = await searchTransactions(query)
          setResults(r)
        } catch {
          setResults([])
        }
      })
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  function handleSelect(result: SearchResult) {
    setOpen(false)
    setQuery('')
    router.push(`/accounts/${result.account_id}/months/${result.monthSlug}`)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full justify-between gap-2 px-3 text-muted-foreground"
      >
        <span className="flex items-center gap-2">
          <SearchIcon className="size-4" />
          <span className="text-sm">Rechercher…</span>
        </span>
        <kbd className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline">
          ⌘ K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Cherche un marchand, une catégorie…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.trim().length < 2 ? (
            <CommandEmpty>Tape au moins 2 caractères pour rechercher.</CommandEmpty>
          ) : isPending ? (
            <CommandEmpty>Recherche…</CommandEmpty>
          ) : results.length === 0 ? (
            <CommandEmpty>Aucun résultat.</CommandEmpty>
          ) : (
            <CommandGroup heading={`${results.length} résultat${results.length > 1 ? 's' : ''}`}>
              {results.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`${r.raw_label}-${r.id}`}
                  onSelect={() => handleSelect(r)}
                  className="flex flex-col items-start gap-1 px-3 py-2"
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="line-clamp-1 font-medium">{r.raw_label}</span>
                    <span
                      className={`shrink-0 text-sm tabular-nums ${
                        r.amount >= 0 ? 'text-emerald-700' : ''
                      }`}
                    >
                      {amountFormatter.format(r.amount)}
                    </span>
                  </div>
                  <div className="flex w-full items-center gap-2 text-xs text-muted-foreground">
                    <CreditCardIcon className="size-3" />
                    <span className="line-clamp-1">{r.account_name}</span>
                    <span>·</span>
                    <span>{dateFormatter.format(new Date(r.op_date))}</span>
                    {r.category ? (
                      <>
                        <span>·</span>
                        <span>{r.category}</span>
                      </>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
