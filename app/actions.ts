'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createOrganization(formData: FormData) {
  const supabase = await createClient()

  const orgName = formData.get('orgName') as string

  // Appel de la fonction SQL "create_org_for_user"
  // .rpc() permet d'exécuter une fonction Database (Remote Procedure Call)
  const { data, error } = await supabase.rpc('create_org_for_user', { 
    org_name: orgName 
  })

  if (error) {
    console.error('Erreur RPC:', error)
    return { error: 'Impossible de créer l\'organisation.' }
  }

  // Si tout s'est bien passé, on rafraîchit
  revalidatePath('/')
}