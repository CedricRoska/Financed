import { isSupabaseConfigured } from '@/lib/supabase/server'

export default function HomePage() {
  const isWired = isSupabaseConfigured()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="max-w-2xl text-center">
        <h1 className="text-6xl font-semibold tracking-tight text-neutral-900">Financed</h1>
        <p className="mt-6 text-lg text-neutral-600">
          Reprenez le contrôle de chaque ligne de votre relevé bancaire.
        </p>

        <div
          className={`mt-12 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
            isWired
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
          }`}
        >
          <span aria-hidden>{isWired ? '✅' : '⚠️'}</span>
          <span>{isWired ? 'Supabase wired' : 'Supabase not configured'}</span>
        </div>

        {!isWired ? (
          <p className="mt-6 text-sm text-neutral-500">
            Vérifie que <code className="rounded bg-neutral-100 px-1.5 py-0.5">.env.local</code>{' '}
            contient bien les trois variables Supabase requises (voir{' '}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5">.env.example</code>).
          </p>
        ) : null}
      </div>
    </main>
  )
}
