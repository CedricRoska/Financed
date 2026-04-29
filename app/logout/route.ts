import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /logout — purge la session Supabase et redirige vers /login.
 * Couvre FR3 du PRD.
 *
 * Appelé via un formulaire POST depuis /dashboard (pas de GET pour éviter
 * la déconnexion accidentelle par préchargement / lien).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const url = request.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url, { status: 303 })
}
