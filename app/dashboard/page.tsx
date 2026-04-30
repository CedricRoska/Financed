import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

  // Stats globales
  const { count: txCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })

  const accountsCount = accounts?.length ?? 0
  const totalTransactions = txCount ?? 0

  const { error } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'Une erreur est survenue.') : null

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">Financed</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">{user.email}</span>
          <form action="/logout" method="POST">
            <Button type="submit" variant="outline" size="sm">
              Se déconnecter
            </Button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          {/* Hero */}
          <section>
            <p className="text-sm text-muted-foreground">Bonjour</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              Reprends la main sur ton argent.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Choisis un compte pour explorer ses transactions, ou ajoute-en un nouveau pour démarrer.
            </p>

            {/* Stats */}
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Comptes
                  </p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums">{accountsCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Transactions
                  </p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums">{totalTransactions}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Mode V1
                  </p>
                  <p className="mt-1 text-base font-medium">
                    Local-cloud · Banque Populaire
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Accounts */}
          <section>
            <div className="flex items-end justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Mes comptes</h2>
              <span className="text-xs text-muted-foreground">
                {accountsCount} compte{accountsCount > 1 ? 's' : ''}
              </span>
            </div>

            {accounts && accounts.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {accounts.map((account) => (
                  <Link key={account.id} href={`/accounts/${account.id}`}>
                    <Card className="h-full transition hover:border-foreground/30 hover:shadow-sm">
                      <CardContent className="flex h-full flex-col gap-3 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="line-clamp-2 text-base font-semibold">
                            {account.name}
                          </span>
                          {account.is_hybrid ? (
                            <Badge
                              variant="outline"
                              className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700"
                            >
                              Pro / Perso
                            </Badge>
                          ) : null}
                        </div>
                        <span className="mt-auto text-xs text-muted-foreground">
                          Créé le {dateFormatter.format(new Date(account.created_at))}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="mt-4">
                <CardContent className="px-6 py-12 text-center">
                  <p className="text-base">Tu n&apos;as pas encore de compte bancaire.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ajoute le premier ci-dessous pour commencer.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Add account */}
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
