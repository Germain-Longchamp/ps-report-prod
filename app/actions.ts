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
  const name = formData.get('name') as string // <-- Ajout ici
  const folderId = formData.get('folderId') as string
  
  // Validation
  if (!url || !folderId) return { error: "URL requise" }

  const { error } = await supabase
    .from('pages')
    .insert({
      url,
      name: name || "Page sans nom", // Valeur par défaut si vide
      folder_id: folderId
    })

  if (error) {
    console.error(error)
    return { error: "Erreur lors de l'ajout de la page" }
  }
  
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



export async function runPageSpeedAudit(url: string, folderId: string, pageId?: string) {
  const supabase = await createClient()

  // 1. ÉTAPE CLÉ : Récupérer la clé API depuis l'Organisation liée au Dossier
  // On fait une jointure : Dossier -> Organisation -> Clé API
  const { data: folderData, error: folderError } = await supabase
    .from('folders')
    .select(`
      organization_id,
      organizations (
        google_api_key
      )
    `)
    .eq('id', folderId)
    .single()

  if (folderError || !folderData?.organizations) {
    console.error("Erreur récupération organisation:", folderError)
    return { error: "Impossible de récupérer la configuration de l'organisation." }
  }

  // On extrait la clé de la réponse Supabase (Notez le tableau car c'est une relation)
  // TypeScript peut voir ça comme un tableau ou un objet selon votre génération de types
  // @ts-ignore : Pour contourner le typage strict si 'organizations' est vu comme un tableau
  const apiKey = Array.isArray(folderData.organizations) 
    ? folderData.organizations[0]?.google_api_key 
    : folderData.organizations?.google_api_key

  if (!apiKey) {
    return { error: "Aucune clé API configurée. Allez dans Paramètres > Général." }
  }

  // 2. Appel API Google PageSpeed (Reste inchangé, mais utilise la bonne variable apiKey)
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo`

  try {
    const response = await fetch(apiUrl)
    const data = await response.json()

    if (data.error) {
      console.error("API Google Error:", data.error)
      return { error: "Erreur Google : " + data.error.message }
    }

    const lighthouse = data.lighthouseResult
    const audits = lighthouse.audits
    const categories = lighthouse.categories

    // 3. Extraction et Sauvegarde (Reste inchangé)
    const performanceScore = Math.round(categories['performance'].score * 100)
    
    const screenshot = audits['final-screenshot']?.details?.data
    const isHttps = audits['is-on-https']?.score === 1
    const isCrawlable = audits['is-crawlable']?.score === 1
    const statusCode = lighthouse.environment?.networkUserAgent ? 200 : 0

    const { error: dbError } = await supabase
      .from('audits')
      .insert({
        folder_id: folderId,
        page_id: pageId || null,
        url: url,
        status_code: statusCode,
        https_valid: isHttps,
        indexable: isCrawlable,
        screenshot: screenshot,
        performance_score: performanceScore,
        report_json: data 
      })

    if (dbError) {
      console.error("DB Insert Error:", dbError)
      return { error: "Erreur lors de la sauvegarde du rapport." }
    }

    // Mise à jour statut dossier
    await supabase
      .from('folders')
      .update({ status: 'up' })
      .eq('id', folderId)

    revalidatePath(`/site/${folderId}`)
    return { success: "Audit terminé avec succès !" }

  } catch (err: any) {
    console.error("Server Action Error:", err)
    return { error: "Erreur interne serveur." }
  }
}





// ...