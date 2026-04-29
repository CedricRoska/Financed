import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

/**
 * Client Supabase utilisable côté navigateur (client components).
 * Utilise les variables publiques NEXT_PUBLIC_*. La RLS protège les données.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
