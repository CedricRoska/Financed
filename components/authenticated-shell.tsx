import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from './app-shell'

/**
 * Server component qui fetche user + accounts puis rend l'AppShell client.
 * Wrapper standard pour toutes les pages authentifiées.
 */
export async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, is_hybrid')
    .order('created_at', { ascending: false })

  return (
    <AppShell email={user.email ?? ''} accounts={accounts ?? []}>
      {children}
    </AppShell>
  )
}
