import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeftIcon, LogOutIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form action="/logout" method="POST">
            <Button type="submit" variant="outline" size="sm">
              <LogOutIcon className="size-4" />
              Se déconnecter
            </Button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-10">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Paramètres</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gère ton compte, tes données personnelles, et la suppression définitive.
            </p>
          </div>

          <SettingsClient email={user.email ?? ''} />
        </div>
      </main>
    </div>
  )
}
