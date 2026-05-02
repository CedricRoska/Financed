'use client'

import { MoreVerticalIcon, PencilIcon, Trash2Icon } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { deleteAccount, renameAccount } from './actions'

export function AccountActions({
  accountId,
  accountName,
}: {
  accountId: string
  accountName: string
}) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [newName, setNewName] = useState(accountName)
  const [isPending, startTransition] = useTransition()

  function handleRename(formData: FormData) {
    startTransition(async () => {
      try {
        await renameAccount(formData)
        toast.success('Compte renommé')
      } catch {
        toast.error('Impossible de renommer')
      }
    })
  }

  function handleDelete() {
    const formData = new FormData()
    formData.set('account_id', accountId)
    startTransition(async () => {
      try {
        await deleteAccount(formData)
        toast.success('Compte supprimé')
      } catch {
        toast.error('Impossible de supprimer')
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="icon" aria-label="Actions du compte" />
          }
        >
          <MoreVerticalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            <PencilIcon className="size-4" />
            Renommer
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2Icon className="size-4" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer le compte</DialogTitle>
            <DialogDescription>
              Le nom est purement libre. Tu peux le changer autant de fois que tu veux.
            </DialogDescription>
          </DialogHeader>
          <form action={handleRename} className="flex flex-col gap-4">
            <input type="hidden" name="account_id" value={accountId} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="rename-name">Nouveau nom</Label>
              <Input
                id="rename-name"
                name="name"
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
                onClick={() => setRenameOpen(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isPending || newName.trim() === '' || newName === accountName}
              >
                {isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est <strong>irréversible</strong>. Toutes les transactions
              importées et leurs annotations seront supprimées en cascade.
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
    </>
  )
}
