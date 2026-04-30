'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { parseCSVFile } from '@/lib/import/parse-csv'
import type { ImportError, ImportPreview } from '@/lib/import/types'
import { commitImport, previewImport } from './actions'

type Phase =
  | { kind: 'upload' }
  | { kind: 'parsing' }
  | { kind: 'preview'; preview: ImportPreview; fileName: string }
  | { kind: 'committing' }
  | { kind: 'success'; inserted: number; duplicates: number }

const amountFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export default function ImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: accountId } = use(params)
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>({ kind: 'upload' })
  const [error, setError] = useState<ImportError | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setPhase({ kind: 'parsing' })

    const result = await parseCSVFile(file)
    if ('kind' in result) {
      setError(result)
      setPhase({ kind: 'upload' })
      return
    }

    try {
      const preview = await previewImport(result.transactions, accountId)
      setPhase({ kind: 'preview', preview, fileName: file.name })
    } catch (e) {
      setError({
        kind: 'parse',
        message: e instanceof Error ? e.message : 'Erreur inconnue lors du preview.',
      })
      setPhase({ kind: 'upload' })
    }
  }

  async function handleCommit() {
    if (phase.kind !== 'preview') return
    setPhase({ kind: 'committing' })

    try {
      const result = await commitImport(
        phase.preview.transactions,
        accountId,
        phase.fileName,
      )
      setPhase({ kind: 'success', inserted: result.inserted, duplicates: result.duplicates })
    } catch (e) {
      setError({
        kind: 'parse',
        message: e instanceof Error ? e.message : 'Erreur inconnue lors du commit.',
      })
      setPhase({ kind: 'upload' })
    }
  }

  function handleCancel() {
    setError(null)
    setPhase({ kind: 'upload' })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
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

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Importer un relevé</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Format supporté : CSV Banque Populaire. Glisse simplement le fichier exporté depuis ton espace en ligne.
            </p>
          </div>

          {error ? (
            <div
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {error.message}
            </div>
          ) : null}

          {phase.kind === 'upload' || phase.kind === 'parsing' ? (
            <UploadView phase={phase} onFile={handleFile} />
          ) : null}

          {phase.kind === 'preview' ? (
            <PreviewView
              preview={phase.preview}
              fileName={phase.fileName}
              onCommit={handleCommit}
              onCancel={handleCancel}
            />
          ) : null}

          {phase.kind === 'committing' ? (
            <Card>
              <CardContent className="px-6 py-12 text-center text-sm text-muted-foreground">
                Import en cours…
              </CardContent>
            </Card>
          ) : null}

          {phase.kind === 'success' ? (
            <SuccessView
              inserted={phase.inserted}
              duplicates={phase.duplicates}
              onBack={() => router.push(`/accounts/${accountId}`)}
            />
          ) : null}
        </div>
      </main>
    </div>
  )
}

function UploadView({
  phase,
  onFile,
}: {
  phase: { kind: 'upload' | 'parsing' }
  onFile: (file: File) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const isParsing = phase.kind === 'parsing'

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) onFile(file)
      }}
      className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-20 transition ${
        isDragging
          ? 'border-emerald-500 bg-emerald-50/50'
          : 'border-border bg-muted/20'
      }`}
    >
      <p className="text-base font-medium">
        {isParsing ? 'Analyse du fichier…' : 'Glisse ton fichier CSV ici'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {isParsing ? 'Patiente quelques secondes' : 'ou clique sur le bouton ci-dessous'}
      </p>

      {!isParsing ? (
        <label className="mt-6 inline-flex cursor-pointer items-center rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:bg-foreground/90">
          Sélectionner un fichier
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFile(file)
            }}
          />
        </label>
      ) : null}
    </div>
  )
}

function PreviewView({
  preview,
  fileName,
  onCommit,
  onCancel,
}: {
  preview: ImportPreview
  fileName: string
  onCommit: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{fileName}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Prévisualisation</h2>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="button" onClick={onCommit} disabled={preview.newCount === 0}>
            Confirmer ({preview.newCount} nouvelle{preview.newCount > 1 ? 's' : ''})
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{preview.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Nouvelles</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">
              {preview.newCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Doublons</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-muted-foreground">
              {preview.duplicateCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="w-[120px]">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.transactions.map((t) => (
              <TableRow key={t.hash}>
                <TableCell className="text-muted-foreground">
                  {dateFormatter.format(new Date(t.op_date))}
                </TableCell>
                <TableCell className="font-medium">{t.raw_label}</TableCell>
                <TableCell
                  className={`text-right tabular-nums ${
                    t.amount >= 0 ? 'font-medium text-emerald-700' : ''
                  }`}
                >
                  {amountFormatter.format(t.amount)}
                </TableCell>
                <TableCell>
                  {t.status === 'new' ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50 text-emerald-700"
                    >
                      Nouvelle
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Doublon
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function SuccessView({
  inserted,
  duplicates,
  onBack,
}: {
  inserted: number
  duplicates: number
  onBack: () => void
}) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/50">
      <CardContent className="px-6 py-12 text-center">
        <p className="text-base font-medium text-emerald-900">Import terminé ✅</p>
        <p className="mt-2 text-sm text-emerald-800">
          {inserted} transaction{inserted > 1 ? 's' : ''} importée{inserted > 1 ? 's' : ''}
          {duplicates > 0
            ? `, ${duplicates} doublon${duplicates > 1 ? 's' : ''} ignoré${duplicates > 1 ? 's' : ''}`
            : ''}
          .
        </p>
        <Button onClick={onBack} className="mt-6">
          Retour au compte
        </Button>
      </CardContent>
    </Card>
  )
}
