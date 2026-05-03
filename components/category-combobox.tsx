'use client'

import { CheckIcon, ChevronDownIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type ComboboxItem = {
  name: string
  count?: number
}

type Props = {
  /** Étiquette affichée au-dessus */
  label: string
  /** Valeur courante */
  value: string
  /** Liste des items existants */
  items: ComboboxItem[]
  /** Callback sur changement (nouvelle valeur ou '') */
  onChange: (value: string) => void
  /** Callback rename : (oldName, newName) */
  onRename?: (oldName: string, newName: string) => Promise<void>
  /** Callback delete : (name) */
  onDelete?: (name: string) => Promise<void>
  /** Placeholder dans le bouton */
  placeholder?: string
  /** Disable le composant */
  disabled?: boolean
  /** Hint affiché au-dessus à droite */
  hint?: React.ReactNode
}

export function CategoryCombobox({
  label,
  value,
  items,
  onChange,
  onRename,
  onDelete,
  placeholder = 'Sélectionner…',
  disabled = false,
  hint,
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef<HTMLInputElement | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (editingItem !== null) {
      // Petit délai pour laisser le Popover gérer le focus
      const timer = setTimeout(() => editInputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [editingItem])

  const trimmedSearch = search.trim()
  const exactMatch = items.find((it) => it.name.toLowerCase() === trimmedSearch.toLowerCase())
  const canCreate =
    trimmedSearch.length >= 2 &&
    !exactMatch &&
    !disabled

  function handleSelect(name: string) {
    onChange(name)
    setOpen(false)
    setSearch('')
    setEditingItem(null)
  }

  function handleClear() {
    onChange('')
    setOpen(false)
  }

  async function handleRenameSubmit() {
    if (!editingItem || !onRename) return
    const trimmed = editValue.trim()
    if (trimmed.length < 2) {
      toast.error('Le nom doit contenir au moins 2 caractères')
      return
    }
    if (trimmed === editingItem) {
      setEditingItem(null)
      return
    }
    setIsRenaming(true)
    try {
      await onRename(editingItem, trimmed)
      toast.success(`« ${editingItem} » renommé en « ${trimmed} »`)
      // Si la valeur courante était l'ancien nom, mettre à jour
      if (value === editingItem) onChange(trimmed)
      setEditingItem(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec du rename')
    } finally {
      setIsRenaming(false)
    }
  }

  async function handleDelete(name: string) {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(name)
      toast.success(`« ${name} » supprimé`)
      if (value === name) onChange('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec suppression')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {hint}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                'w-full justify-between font-normal',
                !value && 'text-muted-foreground',
              )}
            />
          }
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width,_320px] p-0" align="start">
          <Command shouldFilter={editingItem === null}>
            <CommandInput
              placeholder="Rechercher ou créer…"
              value={search}
              onValueChange={(v) => {
                setSearch(v)
                setEditingItem(null)
              }}
            />
            <CommandList>
              <CommandEmpty>
                {trimmedSearch.length < 2 ? (
                  <span className="text-xs">Tape au moins 2 caractères</span>
                ) : (
                  <span className="text-xs">Aucun résultat</span>
                )}
              </CommandEmpty>

              {value ? (
                <CommandGroup heading="Sélection actuelle">
                  <CommandItem
                    value={`__clear-${value}`}
                    onSelect={handleClear}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <XIcon className="size-4 text-muted-foreground" />
                      <span>Retirer « {value} »</span>
                    </span>
                  </CommandItem>
                </CommandGroup>
              ) : null}

              {canCreate ? (
                <CommandGroup heading="Créer">
                  <CommandItem
                    value={`__create-${trimmedSearch}`}
                    onSelect={() => handleSelect(trimmedSearch)}
                    className="flex items-center gap-2"
                  >
                    <PlusIcon className="size-4 text-emerald-700" />
                    <span>
                      Créer « <strong>{trimmedSearch}</strong> »
                    </span>
                  </CommandItem>
                </CommandGroup>
              ) : null}

              {items.length > 0 ? (
                <CommandGroup heading="Existants">
                  {items.map((item) => {
                    const isEditing = editingItem === item.name
                    return (
                      <CommandItem
                        key={item.name}
                        value={item.name}
                        onSelect={() => {
                          if (!isEditing) handleSelect(item.name)
                        }}
                        className="group flex items-center justify-between gap-2"
                      >
                        {isEditing ? (
                          <div className="flex flex-1 items-center gap-2">
                            <Input
                              ref={editInputRef}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  void handleRenameSubmit()
                                } else if (e.key === 'Escape') {
                                  e.preventDefault()
                                  setEditingItem(null)
                                }
                                e.stopPropagation()
                              }}
                              className="h-7"
                              maxLength={100}
                              disabled={isRenaming}
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={(e) => {
                                e.stopPropagation()
                                void handleRenameSubmit()
                              }}
                              disabled={isRenaming}
                            >
                              <CheckIcon className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingItem(null)
                              }}
                              disabled={isRenaming}
                            >
                              <XIcon className="size-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-1 items-center gap-2 truncate">
                              <span className="truncate">{item.name}</span>
                              {item.count !== undefined ? (
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  {item.count}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 group-data-[selected=true]:opacity-100">
                              {value === item.name ? (
                                <CheckIcon className="size-4 text-foreground" />
                              ) : null}
                              {onRename ? (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="size-7"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingItem(item.name)
                                    setEditValue(item.name)
                                  }}
                                  aria-label={`Renommer ${item.name}`}
                                  disabled={isDeleting}
                                >
                                  <PencilIcon className="size-3.5" />
                                </Button>
                              ) : null}
                              {onDelete ? (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="size-7 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void handleDelete(item.name)
                                  }}
                                  aria-label={`Supprimer ${item.name}`}
                                  disabled={isDeleting}
                                >
                                  <Trash2Icon className="size-3.5" />
                                </Button>
                              ) : null}
                            </div>
                          </>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
