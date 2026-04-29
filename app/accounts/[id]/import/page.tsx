'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use, useState } from 'react'
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
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-12">
      <header className="flex items-center justify-between">
        <Link
          href={`/accounts/${accountId}`}
          className="text-sm text-neutral-500 transition hover:text-neutral-700"
        >
          ← Retour au compte
        </Link>
        <form action="/logout" method="POST">
          <button
            type="submit"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Se déconnecter
          </button>
        </form>
      </header>

      <h1 className="mt-10 text-3xl font-semibold tracking-tight text-neutral-900">
        Importer un relevé
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Format supporté : CSV Banque Populaire (séparateur <code>;</code>, encoding UTF-8).
      </p>

      {error ? (
        <div
          className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200"
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
        <p className="mt-12 text-center text-sm text-neutral-500">Import en cours…</p>
      ) : null}

      {phase.kind === 'success' ? (
        <SuccessView
          inserted={phase.inserted}
          duplicates={phase.duplicates}
          onBack={() => router.push(`/accounts/${accountId}`)}
        />
      ) : null}
    </main>
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
      className={`mt-10 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 transition ${
        isDragging
          ? 'border-emerald-500 bg-emerald-50'
          : 'border-neutral-300 bg-neutral-50/50'
      }`}
    >
      <p className="text-base font-medium text-neutral-800">
        {isParsing ? 'Analyse du fichier…' : 'Glisse ton fichier CSV ici'}
      </p>
      <p className="mt-1 text-sm text-neutral-500">
        {isParsing ? 'Patiente quelques secondes' : 'ou clique sur le bouton ci-dessous'}
      </p>

      {!isParsing ? (
        <label className="mt-6 inline-flex cursor-pointer items-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800">
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
    <section className="mt-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-500">{fileName}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-neutral-900">
            Prévisualisation
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onCommit}
            disabled={preview.newCount === 0}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirmer l&apos;import ({preview.newCount} nouvelle{preview.newCount > 1 ? 's' : ''})
          </button>
        </div>
      </header>

      <dl className="mt-6 grid grid-cols-3 gap-4">
        <Stat label="Total" value={preview.total} />
        <Stat label="Nouvelles" value={preview.newCount} accent="emerald" />
        <Stat label="Doublons" value={preview.duplicateCount} accent="neutral" />
      </dl>

      <div className="mt-8 overflow-hidden rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Libellé</th>
              <th className="px-4 py-3 text-right font-medium">Montant</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {preview.transactions.map((t) => (
              <tr key={t.hash}>
                <td className="px-4 py-3 text-neutral-600">
                  {dateFormatter.format(new Date(t.op_date))}
                </td>
                <td className="px-4 py-3 text-neutral-900">{t.raw_label}</td>
                <td className="px-4 py-3 text-right tabular-nums text-neutral-900">
                  {amountFormatter.format(t.amount)}
                </td>
                <td className="px-4 py-3">
                  {t.status === 'new' ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                      Nouvelle
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 ring-1 ring-neutral-200">
                      Doublon
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  accent = 'default',
}: {
  label: string
  value: number
  accent?: 'default' | 'emerald' | 'neutral'
}) {
  const colorClass =
    accent === 'emerald'
      ? 'text-emerald-700'
      : accent === 'neutral'
        ? 'text-neutral-600'
        : 'text-neutral-900'
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
      <dt className="text-xs uppercase tracking-wider text-neutral-500">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold tabular-nums ${colorClass}`}>{value}</dd>
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
    <section className="mt-12 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
      <p className="text-base font-medium text-emerald-900">
        Import terminé ✅
      </p>
      <p className="mt-2 text-sm text-emerald-800">
        {inserted} transaction{inserted > 1 ? 's' : ''} importée{inserted > 1 ? 's' : ''}
        {duplicates > 0 ? `, ${duplicates} doublon${duplicates > 1 ? 's' : ''} ignoré${duplicates > 1 ? 's' : ''}` : ''}.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
      >
        Retour au compte
      </button>
    </section>
  )
}
