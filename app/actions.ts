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

// app/actions.ts (Ajouts)

// ... imports existants

// Mettre à jour le Profil Utilisateur
export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Non connecté" }

  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      email: user.email // On garde l'email synchro au cas où
    })

  if (error) {
    console.error('Erreur update profile:', error)
    return { error: "Erreur lors de la mise à jour du profil" }
  }

  revalidatePath('/settings')
  return { success: "Profil mis à jour" }
}

// Mettre à jour les paramètres de l'Organisation (Clé API)
export async function updateOrgSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Non connecté" }

  const apiKey = formData.get('apiKey') as string
  const orgId = formData.get('orgId') as string

  // Vérification de sécurité : L'user appartient-il bien à cette org ?
  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('organization_id', orgId)
    .single()

  if (!member) return { error: "Accès non autorisé à cette organisation" }

  const { error } = await supabase
    .from('organizations')
    .update({ google_api_key: apiKey })
    .eq('id', orgId)

  if (error) {
    console.error('Erreur update org:', error)
    return { error: "Erreur lors de la sauvegarde de la clé API" }
  }

  revalidatePath('/settings')
  return { success: "Paramètres d'organisation mis à jour" }
}

// app/actions.ts (Ajouts pour la gestion des Pages)

// Ajouter une sous-page
export async function createPage(formData: FormData) {
  const supabase = await createClient()
  
  const url = formData.get('url') as string
  const folderId = formData.get('folderId') as string
  
  // Validation basique
  if (!url || !folderId) return { error: "URL requise" }

  const { error } = await supabase
    .from('pages')
    .insert({
      url,
      folder_id: folderId
    })

  if (error) return { error: "Erreur lors de l'ajout de la page" }
  
  revalidatePath(`/site/${folderId}`)
  return { success: "Page ajoutée" }
}

// Supprimer une sous-page
export async function deletePage(pageId: string, folderId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('pages')
    .delete()
    .eq('id', pageId)

  if (error) return { error: "Impossible de supprimer" }
  
  revalidatePath(`/site/${folderId}`)
  return { success: "Page supprimée" }
}