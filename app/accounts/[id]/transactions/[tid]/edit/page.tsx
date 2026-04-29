import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DEFAULT_CATEGORY_SUGGESTIONS } from '@/lib/categories/defaults'
import { monthSlugFromOpDate } from '@/lib/months/format'
import { createClient } from '@/lib/supabase/server'
import { saveAnnotation } from './actions'

const amountFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

const ERROR_MESSAGES: Record<string, string> = {
  'save-failed': 'Impossible de sauvegarder. Réessaie dans un instant.',
}

export default async function EditTransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; tid: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id: accountId, tid: transactionId } = await params
  const { error } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'Erreur inconnue.') : null

  const supabase = await createClient()

  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, is_hybrid')
    .eq('id', accountId)
    .maybeSingle()

  if (!account) {
    redirect('/dashboard')
  }

  const { data: transaction } = await supabase
    .from('transactions')
    .select('id, op_date, amount, raw_label, transaction_annotations(category, comment, pro_perso, expected_refund_from, expected_refund_label)')
    .eq('id', transactionId)
    .eq('account_id', accountId)
    .maybeSingle()

  if (!transaction) {
    redirect(`/accounts/${accountId}`)
  }

  // transaction_annotations est renvoyé comme array par Supabase pour les
  // relations FK, on prend le premier (UNIQUE garantit 0 ou 1).
  const annotationsRaw = transaction.transaction_annotations
  const annotation = Array.isArray(annotationsRaw) ? (annotationsRaw[0] ?? null) : annotationsRaw

  const monthSlug = monthSlugFromOpDate(transaction.op_date)

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-12">
      <header className="flex items-center justify-between">
        <Link
          href={`/accounts/${accountId}/months/${monthSlug}`}
          className="text-sm text-neutral-500 transition hover:text-neutral-700"
        >
          ← Retour au mois
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

      <section className="mt-10">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          Annoter la transaction
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {dateFormatter.format(new Date(transaction.op_date))} · {transaction.raw_label} ·{' '}
          <span className={Number(transaction.amount) >= 0 ? 'text-emerald-700' : 'text-red-700'}>
            {amountFormatter.format(Number(transaction.amount))}
          </span>
        </p>
      </section>

      {errorMessage ? (
        <div
          className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      <form action={saveAnnotation} className="mt-10 flex flex-col gap-6">
        <input type="hidden" name="transaction_id" value={transactionId} />
        <input type="hidden" name="account_id" value={accountId} />

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-700">Catégorie</span>
          <input
            type="text"
            name="category"
            list="category-suggestions"
            maxLength={100}
            defaultValue={annotation?.category ?? ''}
            placeholder="Ex. Courses, Loyer, Salaire..."
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-emerald-500/20 focus:border-emerald-500 focus:ring-4"
          />
          <datalist id="category-suggestions">
            {DEFAULT_CATEGORY_SUGGESTIONS.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </label>

        {account.is_hybrid ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-neutral-700">
              Pro ou perso ?
            </legend>
            <div className="flex gap-4">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="pro_perso"
                  value=""
                  defaultChecked={!annotation?.pro_perso}
                  className="h-4 w-4 border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-neutral-700">Non classé</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="pro_perso"
                  value="pro"
                  defaultChecked={annotation?.pro_perso === 'pro'}
                  className="h-4 w-4 border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-neutral-700">Pro</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="pro_perso"
                  value="perso"
                  defaultChecked={annotation?.pro_perso === 'perso'}
                  className="h-4 w-4 border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-neutral-700">Perso</span>
              </label>
            </div>
          </fieldset>
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-700">
            Commentaire <span className="text-neutral-400">(optionnel)</span>
          </span>
          <textarea
            name="comment"
            maxLength={1000}
            rows={3}
            defaultValue={annotation?.comment ?? ''}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-emerald-500/20 focus:border-emerald-500 focus:ring-4"
          />
        </label>

        <fieldset className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
          <legend className="px-2 text-sm font-medium text-neutral-700">
            Quelqu&apos;un me doit
          </legend>
          <p className="mb-3 text-xs text-neutral-500">
            Si tu attends un remboursement pour cette dépense, indique-le ici. La transaction
            restera comptée comme non lettrée jusqu&apos;à réception du virement.
          </p>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-700">Nom du débiteur</span>
              <input
                type="text"
                name="expected_refund_from"
                maxLength={100}
                defaultValue={annotation?.expected_refund_from ?? ''}
                placeholder="Ex. Paul"
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-emerald-500/20 focus:border-emerald-500 focus:ring-4"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-700">Libellé du remboursement</span>
              <input
                type="text"
                name="expected_refund_label"
                maxLength={200}
                defaultValue={annotation?.expected_refund_label ?? ''}
                placeholder="Ex. Bretagne 2026"
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-emerald-500/20 focus:border-emerald-500 focus:ring-4"
              />
            </label>
          </div>
        </fieldset>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Enregistrer
          </button>
          <Link
            href={`/accounts/${accountId}/months/${monthSlug}`}
            className="text-sm text-neutral-500 transition hover:text-neutral-700"
          >
            Annuler
          </Link>
        </div>
      </form>
    </main>
  )
}
