'use client'

import { AlertTriangleIcon, DownloadIcon, Trash2Icon } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { deleteUserAccount, exportUserData } from './actions'

export function SettingsClient({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  function handleExport() {
    startTransition(async () => {
      try {
        const json = await exportUserData()
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `financed-export-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Export téléchargé')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Échec de l'export")
      }
    })
  }

  function handleDelete() {
    if (confirmText !== 'SUPPRIMER') {
      toast.error('Tape exactement SUPPRIMER pour confirmer')
      return
    }
    startTransition(async () => {
      try {
        await deleteUserAccount()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Échec de la suppression')
      }
    })
  }

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Compte</h2>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Email</p>
              <p className="mt-1 font-medium">{email}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Données personnelles (RGPD)</h2>
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <p className="font-medium">Exporter mes données</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Télécharge un JSON contenant l&apos;intégralité de tes données :
                comptes, transactions, annotations, journal d&apos;audit.
              </p>
            </div>
            <Button onClick={handleExport} disabled={isPending} className="shrink-0">
              <DownloadIcon className="size-4" />
              Télécharger l&apos;export
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Zone dangereuse</h2>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <p className="font-medium text-destructive">Supprimer mon compte</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Supprime définitivement tous tes comptes bancaires, transactions et
                annotations. Cette action est <strong>irréversible</strong>.
              </p>
            </div>
            <Button
              variant="outline"
              className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2Icon className="size-4" />
              Supprimer mon compte
            </Button>
          </CardContent>
        </Card>
      </section>

      <Sheet open={confirmOpen} onOpenChange={setConfirmOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="size-5 text-destructive" />
              Supprimer mon compte
            </SheetTitle>
            <SheetDescription>
              Cette action est <strong>définitive</strong>. Toutes tes données seront
              supprimées en cascade :
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4 py-4">
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              <li>· Tous tes comptes bancaires</li>
              <li>· Toutes tes transactions importées</li>
              <li>· Toutes tes annotations (catégories, commentaires, remboursements)</li>
              <li>· Ton journal d&apos;audit</li>
            </ul>

            <p className="text-sm">
              Si tu veux garder une copie, fais d&apos;abord un export RGPD au-dessus.
            </p>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-delete">
                Pour confirmer, tape exactement{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono">SUPPRIMER</code>
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                placeholder="SUPPRIMER"
              />
            </div>
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
              disabled={isPending || confirmText !== 'SUPPRIMER'}
            >
              <Trash2Icon className="size-4" />
              {isPending ? 'Suppression…' : 'Confirmer la suppression'}
            </Button>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
