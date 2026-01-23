import { createClient } from '@/utils/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // 1. Déconnexion Supabase (Nettoyage des cookies de session)
  await supabase.auth.signOut()

  // 2. Redirection vers la page de login
  // On utilise 302 pour une redirection temporaire standard
  return NextResponse.redirect(new URL('/login', req.url), {
    status: 302,
  })
}