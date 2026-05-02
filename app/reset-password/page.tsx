import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePassword } from './actions'

const ERROR_MESSAGES: Record<string, string> = {
  'password-too-short': 'Le mot de passe doit contenir au moins 6 caractères.',
  'update-failed':
    'Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré.',
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'Erreur inconnue.') : null

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Nouveau mot de passe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choisis un nouveau mot de passe pour ton compte.
          </p>

          <form action={updatePassword} className="mt-10 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <span className="text-xs text-muted-foreground">6 caractères minimum</span>
              </div>
              <Input
                id="password"
                type="password"
                name="password"
                required
                autoComplete="new-password"
                minLength={6}
                placeholder="••••••••"
                autoFocus
              />
            </div>

            {errorMessage ? (
              <p
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}

            <Button type="submit" className="mt-2 w-full">
              Mettre à jour
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Retour à la connexion
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-foreground text-background lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:px-12 lg:py-16">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-foreground via-foreground to-foreground/80" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative">
          <div className="text-2xl font-semibold tracking-tight">Financed</div>
        </div>

        <div className="relative space-y-6">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Presque fini.
          </h2>
          <p className="max-w-md text-background/80">
            Une fois ton mot de passe mis à jour, tu seras automatiquement
            connecté.
          </p>
        </div>
      </div>
    </div>
  )
}
