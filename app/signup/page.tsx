import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signup } from './actions'

const ERROR_MESSAGES: Record<string, string> = {
  'email-taken': 'Cet email est déjà utilisé. Connecte-toi ou utilise un autre email.',
  'password-too-short': 'Le mot de passe doit contenir au moins 6 caractères.',
  'invalid-form': 'Le formulaire est incomplet ou invalide.',
  'signup-failed': "Impossible de créer le compte. Réessaie dans un instant.",
}

export default async function SignupPage({
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
          <h1 className="text-2xl font-semibold tracking-tight">Bienvenue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crée ton compte pour démarrer ton rituel financier.
          </p>

          <form action={signup} className="mt-10 flex flex-col gap-5">
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
              Créer mon compte
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Déjà un compte ?{' '}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>

      {/* Right — brand showcase */}
      <div className="relative hidden overflow-hidden bg-foreground text-background lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:px-12 lg:py-16">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-foreground via-foreground to-foreground/80" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative">
          <div className="text-2xl font-semibold tracking-tight">Financed</div>
        </div>

        <div className="relative space-y-8">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Un rituel financier <br />qui t&apos;apaise.
          </h2>
          <p className="max-w-md text-background/80">
            Importe ton relevé. Valide chaque ligne. Marque qui te doit quoi. Retrouve-toi dans ton argent — sans laisser une IA décider à ta place.
          </p>
          <ul className="space-y-2 text-sm text-background/70">
            <li>· Sans connexion bancaire</li>
            <li>· Lettrage avancé pour les remboursements</li>
            <li>· Score mensuel mathématique, sans prédictif</li>
            <li>· Conçu pour être premium et clair</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
