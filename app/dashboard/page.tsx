import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
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
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Financed</h1>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <form action="/logout" method="POST">
          <Button type="submit" variant="outline" size="sm">
            Se déconnecter
          </Button>
        </form>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-10">
          <section>
            <h2 className="text-2xl font-semibold tracking-tight">Mes comptes</h2>

            {accounts && accounts.length > 0 ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {accounts.map((account) => (
                  <Link key={account.id} href={`/accounts/${account.id}`}>
                    <Card className="transition hover:border-foreground/30 hover:shadow-sm">
                      <CardContent className="flex flex-col gap-2 p-5">
                        <div className="flex items-center justify-between">
                          <span className="text-base font-semibold">{account.name}</span>
                          {account.is_hybrid ? (
                            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                              Pro / Perso
                            </Badge>
                          ) : null}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {dateFormatter.format(new Date(account.created_at))}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="mt-6">
                <CardContent className="px-6 py-12 text-center">
                  <p className="text-base">Tu n&apos;as pas encore de compte bancaire.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ajoute le premier ci-dessous pour commencer.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Ajouter un compte
            </h3>
            <Card className="mt-4">
              <CardContent className="p-6">
                <form action={createAccount} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="account-name">Nom du compte</Label>
                    <Input
                      id="account-name"
                      type="text"
                      name="name"
                      required
                      minLength={1}
                      maxLength={100}
                      placeholder="ex. Banque Populaire Perso"
                    />
                  </div>

                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_hybrid"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                    />
                    <span className="text-sm">
                      Ce compte mélange des dépenses pro et perso
                    </span>
                  </label>

                  {errorMessage ? (
                    <p
                      className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                      role="alert"
                    >
                      {errorMessage}
                    </p>
                  ) : null}

                  <Button type="submit" className="self-start">
                    Créer le compte
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}
