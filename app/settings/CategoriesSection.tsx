'use client'

import { PencilIcon, TagIcon, Trash2Icon } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
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
import { deleteCategory, renameCategory, type UserCategory } from './categories-actions'

export function CategoriesSection({ categories }: { categories: UserCategory[] }) {
  const [renameTarget, setRenameTarget] = useState<UserCategory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserCategory | null>(null)
  const [newName, setNewName] = useState('')
  const [isPending, startTransition] = useTransition()

  function openRename(cat: UserCategory) {
    setRenameTarget(cat)
    setNewName(cat.name)
  }

  function handleRename(formData: FormData) {
    startTransition(async () => {
      try {
        await renameCategory(formData)
        toast.success('Catégorie renommée')
        setRenameTarget(null)
      } catch {
        toast.error('Impossible de renommer')
      }
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    const formData = new FormData()
    formData.set('name', deleteTarget.name)
    startTransition(async () => {
      try {
        await deleteCategory(formData)
        toast.success('Catégorie supprimée — les transactions repassent à traiter')
        setDeleteTarget(null)
      } catch {
        toast.error('Impossible de supprimer')
      }
    })
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <TagIcon className="size-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold tracking-tight">Catégories</h2>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-10 text-center text-sm text-muted-foreground">
            Pas encore de catégorie créée. Catégorise tes premières transactions et elles
            apparaîtront ici.
          </CardContent>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y">
            {categories.map((cat) => (
              <li key={cat.name} className="flex flex-col gap-2 px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-1 items-center gap-3">
                    <Badge variant="secondary" className="font-medium">
                      {cat.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {cat.count} transaction{cat.count > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openRename(cat)}
                      aria-label={`Renommer ${cat.name}`}
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(cat)}
                      aria-label={`Supprimer ${cat.name}`}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </div>
                {cat.subcategories.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pl-2">
                    {cat.subcategories.map((sub) => (
                      <Badge
                        key={sub.name}
                        variant="outline"
                        className="font-normal"
                      >
                        {sub.name}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {sub.count}
                        </span>
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Rename dialog */}
      <Dialog open={renameTarget !== null} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer la catégorie</DialogTitle>
            <DialogDescription>
              Toutes les transactions catégorisées « {renameTarget?.name} » seront mises à
              jour automatiquement.
            </DialogDescription>
          </DialogHeader>
          <form action={handleRename} className="flex flex-col gap-4">
            <input type="hidden" name="old_name" value={renameTarget?.name ?? ''} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="cat-rename">Nouveau nom</Label>
              <Input
                id="cat-rename"
                name="new_name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                minLength={1}
                maxLength={100}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameTarget(null)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={
                  isPending || newName.trim() === '' || newName === renameTarget?.name
                }
              >
                {isPending ? 'Enregistrement…' : 'Renommer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la catégorie ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.count} transaction{(deleteTarget?.count ?? 0) > 1 ? 's' : ''}{' '}
              utilisent <strong>{deleteTarget?.name}</strong>. Elles repasseront «
              à traiter » et tu pourras les recatégoriser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Suppression…' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
