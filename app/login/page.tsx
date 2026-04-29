import Link from 'next/link'
import { login } from './actions'

const ERROR_MESSAGES: Record<string, string> = {
  'invalid-credentials': 'Identifiants invalides. Vérifie ton email et ton mot de passe.',
  'invalid-form': 'Le formulaire est incomplet ou invalide.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'Une erreur est survenue.') : null

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-4xl font-semibold tracking-tight text-neutral-900">
          Financed
        </h1>
        <p className="mt-3 text-center text-sm text-neutral-600">Connecte-toi à ton compte</p>

        <form action={login} className="mt-10 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-700">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-emerald-500/20 focus:border-emerald-500 focus:ring-4"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-700">Mot de passe</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              minLength={6}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-emerald-500/20 focus:border-emerald-500 focus:ring-4"
            />
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
            className="mt-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-neutral-900/20"
          >
            Se connecter
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-neutral-600">
          Pas encore de compte ?{' '}
          <Link
            href="/signup"
            className="font-medium text-emerald-700 underline-offset-4 hover:underline"
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </main>
  )
}
