import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Le middleware redirige déjà les non-authentifiés, mais double-check pour
  // les server components qui pourraient être servis depuis un cache.
  if (!user) {
    redirect('/login')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-2xl">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Dashboard</h1>
          <form action="/logout" method="POST">
            <button
              type="submit"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 focus:outline-none focus:ring-4 focus:ring-neutral-900/10"
            >
              Se déconnecter
            </button>
          </form>
        </header>

        <section className="mt-10 rounded-xl border border-neutral-200 bg-white p-6">
          <p className="text-sm font-medium text-neutral-500">Connecté en tant que</p>
          <p className="mt-1 text-lg font-medium text-neutral-900">{user.email}</p>
        </section>

        <p className="mt-8 text-sm text-neutral-500">
          C&apos;est ton dashboard. Les comptes bancaires, l&apos;import CSV et le lettrage
          arriveront dans les prochaines étapes.
        </p>
      </div>
    </main>
  )
}
