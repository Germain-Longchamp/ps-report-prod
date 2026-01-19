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


export async function createFolder(formData: FormData) {
  const supabase = await createClient()

  // 1. Vérif Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = formData.get('name') as string
  const url = formData.get('url') as string

  // 2. Retrouver l'ID de l'organisation de l'utilisateur
  // (On suppose qu'il n'en a qu'une pour l'instant pour simplifier)
  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: "Aucune organisation trouvée" }

  // 3. Créer le dossier
  const { error } = await supabase
    .from('folders')
    .insert({
      name: name,
      root_url: url,
      organization_id: member.organization_id,
      created_by: user.id
    })

  if (error) {
    console.error('Erreur création dossier:', error)
    return { error: "Erreur base de données" }
  }

  // 4. Rafraîchir l'affichage
  revalidatePath('/')
  return { success: true }
}