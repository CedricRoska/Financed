import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    <div className="flex min-h-screen">
      {/* Left — form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Bon retour</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connecte-toi pour reprendre la main sur tes finances.
          </p>

          <form action={login} className="mt-10 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="toi@exemple.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Oublié ?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                name="password"
                required
                autoComplete="current-password"
                minLength={6}
                placeholder="••••••••"
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
              Se connecter
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>

      {/* Right — brand showcase */}
      <div className="relative hidden overflow-hidden bg-foreground text-background lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:px-12 lg:py-16">
        {/* Soft gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-foreground via-foreground to-foreground/80" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative">
          <div className="text-2xl font-semibold tracking-tight">Financed</div>
        </div>

        <div className="relative space-y-8">
          <blockquote className="space-y-4 text-lg font-medium leading-relaxed">
            <p>
              « Reprends le contrôle de chaque ligne de ton relevé bancaire. Sans connexion bancaire, sans IA tape-à-l&apos;œil, sans promesse intenable. »
            </p>
          </blockquote>

          <div className="grid grid-cols-2 gap-4 text-sm text-background/70">
            <div>
              <p className="font-medium text-background">Privacy first</p>
              <p className="mt-1">Aucune connexion bancaire. Tu importes, tu valides.</p>
            </div>
            <div>
              <p className="font-medium text-background">Lettrage signature</p>
              <p className="mt-1">Quand Paul te doit 85€, tu le sais. Toujours.</p>
            </div>
            <div>
              <p className="font-medium text-background">LLM saupoudré</p>
              <p className="mt-1">L&apos;IA propose. L&apos;humain dispose.</p>
            </div>
            <div>
              <p className="font-medium text-background">Premium &amp; clair</p>
              <p className="mt-1">Une typo soignée pour un rituel apaisant.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
