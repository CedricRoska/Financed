import 'server-only'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createBaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './types'

/**
 * Client Supabase utilisable côté serveur (server components, route handlers,
 * server actions). Lit/écrit les cookies de session via `next/headers`.
 *
 * Le module `server-only` fait échouer le build si ce fichier est importé
 * depuis un client component.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll appelé depuis un Server Component : on ignore.
            // Le middleware (V1.5+) rafraîchira la session.
          }
        },
      },
    },
  )
}

/**
 * Vérifie que les 3 variables d'env Supabase sont définies.
 * Centralise la lecture de SUPABASE_SERVICE_KEY pour qu'elle ne soit
 * référencée par nom que depuis ce module (NFR10).
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_KEY,
  )
}

/**
 * Client Supabase admin (service_role) — bypass RLS.
 * À n'utiliser QUE depuis des contextes serveur de confiance (route handlers,
 * server actions, scripts), JAMAIS depuis un server component d'une page.
 *
 * NFR10 : la clé service_role n'est jamais exposée au client.
 */
export function createServiceClient() {
  return createBaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
