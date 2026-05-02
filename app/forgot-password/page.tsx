import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sendResetEmail } from './actions'

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>
}) {
  const { sent, error } = await searchParams
  const showSuccess = sent === '1'
  const errorMessage =
    error === 'invalid-form' ? 'Saisis un email valide.' : null

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Mot de passe oublié</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre ton email, on t&apos;envoie un lien pour le réinitialiser.
          </p>

          {showSuccess ? (
            <div
              className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              role="status"
            >
              Si un compte existe pour cet email, un lien de réinitialisation vient
              d&apos;être envoyé. Vérifie ta boîte de réception.
            </div>
          ) : (
            <form action={sendResetEmail} className="mt-10 flex flex-col gap-5">
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

              {errorMessage ? (
                <p
                  className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {errorMessage}
                </p>
              ) : null}

              <Button type="submit" className="mt-2 w-full">
                Envoyer le lien
              </Button>
            </form>
          )}

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
            Privacy first.
          </h2>
          <p className="max-w-md text-background/80">
            Ton lien de réinitialisation n&apos;est valable qu&apos;une heure et n&apos;est
            envoyé qu&apos;à l&apos;email que tu as utilisé pour t&apos;inscrire.
          </p>
        </div>
      </div>
    </div>
  )
}
