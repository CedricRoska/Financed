import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Client Supabase utilisable côté navigateur (client components).
 * Utilise les variables publiques NEXT_PUBLIC_*. La RLS protège les données.
 *
 * NOTE: cast vers SupabaseClient<Database> pour contourner un bug de typage
 * de @supabase/ssr 0.6.1 (Schema résout en `never`). À retirer une fois corrigé upstream.
 */
export function createClient(): SupabaseClient<Database> {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ) as unknown as SupabaseClient<Database>
}
