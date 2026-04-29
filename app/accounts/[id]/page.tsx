import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, is_hybrid, created_at')
    .eq('id', id)
    .maybeSingle()

  // Si non trouvé (compte inexistant ou appartenant à un autre user → RLS filtre),
  // on retourne au dashboard. Pas de 404 explicite : on ne révèle pas l'existence
  // d'un compte qui ne nous appartient pas.
  if (!account) {
    redirect('/dashboard')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12">
      <header className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-sm text-neutral-500 transition hover:text-neutral-700"
        >
          ← Retour au dashboard
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
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            {account.name}
          </h1>
          {account.is_hybrid ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              Pro / Perso
            </span>
          ) : null}
        </div>

        <p className="mt-8 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 px-6 py-10 text-center text-sm text-neutral-500">
          Détail du compte à venir : import CSV, vue mensuelle, lettrage. (Implémenté dans
          les prochains specs.)
        </p>
      </section>
    </main>
  )
}
