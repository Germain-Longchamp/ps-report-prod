'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // On récupère les données du formulaire
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error('Erreur Login:', error)
    // Idéalement on renvoie l'erreur à l'utilisateur, mais restons simple pour l'instant
    redirect('/login?error=true')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
        emailRedirectTo: `${origin}/auth/callback`,
        // ON AJOUTE LES METADATA ICI
        data: {
            first_name: formData.get('firstName') as string,
            last_name: formData.get('lastName') as string,
        }
    }
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    console.error('Erreur Inscription:', error)
    redirect(`/login?error=signup&t=${Date.now()}`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}