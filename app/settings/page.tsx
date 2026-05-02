import { redirect } from 'next/navigation'
import { AuthenticatedShell } from '@/components/authenticated-shell'
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
    <AuthenticatedShell>
      <div className="px-6 py-10 lg:px-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-10">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Paramètres</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gère ton compte, tes données personnelles, et la suppression définitive.
            </p>
          </div>

          <SettingsClient email={user.email ?? ''} />
        </div>
      </div>
    </AuthenticatedShell>
  )
}
