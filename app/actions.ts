'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

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

// Run page speed

export async function runPageSpeedAudit(url: string, folderId: string, pageId?: string) {
  const supabase = await createClient()

  // 1. Récupération de la clé API
  const { data: folderData } = await supabase
    .from('folders')
    .select('organization_id, organizations(google_api_key)')
    .eq('id', folderId)
    .single()

  // @ts-ignore
  const apiKey = Array.isArray(folderData?.organizations) 
    ? folderData.organizations[0]?.google_api_key 
    : folderData?.organizations?.google_api_key

  if (!apiKey) return { error: "Clé API manquante." }

  // 2. Préparation des URLs API (Mobile & Desktop)
  const baseUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&category=performance&category=accessibility&category=best-practices&category=seo`
  
  const mobileUrl = `${baseUrl}&strategy=mobile`
  const desktopUrl = `${baseUrl}&strategy=desktop`

  try {
    // 3. Lancement des 2 analyses en PARALLÈLE (Gain de temps)
    const [mobileRes, desktopRes] = await Promise.all([
      fetch(mobileUrl),
      fetch(desktopUrl)
    ])

    const mobileData = await mobileRes.json()
    const desktopData = await desktopRes.json()

    if (mobileData.error || desktopData.error) {
      console.error("Google API Error", mobileData.error || desktopData.error)
      return { error: "Erreur lors de l'analyse Google." }
    }

    // 4. Extraction des données (Depuis le rapport Mobile principalement)
    const mCats = mobileData.lighthouseResult.categories
    const mAudits = mobileData.lighthouseResult.audits
    
    // Pour le Desktop, on veut juste le score de perf
    const dCats = desktopData.lighthouseResult.categories

    // Métriques
    const perfMobile = Math.round(mCats['performance'].score * 100)
    const perfDesktop = Math.round(dCats['performance'].score * 100)
    const accessScore = Math.round(mCats['accessibility'].score * 100)
    const bestPracticesScore = Math.round(mCats['best-practices'].score * 100)
    const seoScore = Math.round(mCats['seo'].score * 100)
    
    // TTFB (Time to First Byte) en ms
    const ttfb = Math.round(mAudits['server-response-time']?.numericValue || 0)

    // Infos générales
    const screenshot = mAudits['final-screenshot']?.details?.data
    const isHttps = mAudits['is-on-https']?.score === 1
    const isCrawlable = mAudits['is-crawlable']?.score === 1
    const statusCode = mobileData.lighthouseResult.environment?.networkUserAgent ? 200 : 0

    // 5. Sauvegarde
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
        performance_score: perfMobile,         // Mobile par défaut
        performance_desktop_score: perfDesktop, // Nouveau champ
        accessibility_score: accessScore,       // Nouveau
        best_practices_score: bestPracticesScore,// Nouveau
        seo_score: seoScore,                    // Nouveau
        ttfb: ttfb,                             // Nouveau
        report_json: mobileData // On garde le JSON mobile pour le détail
      })

    if (dbError) throw dbError

    // Mise à jour statut dossier racine si c'est lui qu'on audite
    if (!pageId) {
       await supabase.from('folders').update({ status: 'up' }).eq('id', folderId)
    }

    revalidatePath(`/site/${folderId}`)
    return { success: "Audit terminé !" }

  } catch (err: any) {
    console.error("Action Error:", err)
    return { error: "Erreur technique lors de l'audit." }
  }
}

