import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAccount } from './actions'

const ERROR_MESSAGES: Record<string, string> = {
  'invalid-name': 'Le nom du compte doit contenir entre 1 et 100 caractères.',
  'create-failed': 'Impossible de créer le compte. Réessaie dans un instant.',
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Le middleware redirige déjà les non-authentifiés, mais double-check.
  if (!user) {
    redirect('/login')
  }

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, is_hybrid, created_at')
    .order('created_at', { ascending: false })

  const { error } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'Une erreur est survenue.') : null

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500">{user.email}</p>
        </div>
        <form action="/logout" method="POST">
          <button
            type="submit"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 focus:outline-none focus:ring-4 focus:ring-neutral-900/10"
          >
            Se déconnecter
          </button>
        </form>
      </header>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900">Mes comptes</h2>

        {accounts && accounts.length > 0 ? (
          <ul className="mt-6 grid gap-3">
            {accounts.map((account) => (
              <li key={account.id}>
                <Link
                  href={`/accounts/${account.id}`}
                  className="group flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 transition hover:border-neutral-300 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base font-medium text-neutral-900">{account.name}</span>
                    {account.is_hybrid ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                        Pro / Perso
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-neutral-400 group-hover:text-neutral-500">
                    {dateFormatter.format(new Date(account.created_at))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 px-6 py-10 text-center">
            <p className="text-base text-neutral-700">
              Tu n&apos;as pas encore de compte bancaire.
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Ajoute le premier ci-dessous pour commencer.
            </p>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-500">
          Ajouter un compte
        </h3>
        <form action={createAccount} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-700">Nom du compte</span>
            <input
              type="text"
              name="name"
              required
              minLength={1}
              maxLength={100}
              placeholder="ex. Banque Populaire Perso"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-emerald-500/20 focus:border-emerald-500 focus:ring-4"
            />
          </label>

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              name="is_hybrid"
              className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-neutral-700">
              Ce compte mélange des dépenses pro et perso
            </span>
          </label>

          {errorMessage ? (
            <p
              className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            className="self-start rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-neutral-900/20"
          >
            Créer le compte
          </button>
        </form>
      </section>
    </main>
  )
}
