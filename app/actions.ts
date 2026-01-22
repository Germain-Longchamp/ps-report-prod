'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// --- 1. GESTION ORGANISATION & DOSSIERS ---

export async function createOrganization(formData: FormData) {
  const supabase = await createClient()
  const orgName = formData.get('orgName') as string

  const { error } = await supabase.rpc('create_org_for_user', { 
    org_name: orgName 
  })

  if (error) {
    console.error('Erreur RPC:', error)
    return { error: 'Impossible de créer l\'organisation.' }
  }

  revalidatePath('/')
}

export async function createFolder(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = formData.get('name') as string
  const url = formData.get('url') as string

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: "Aucune organisation trouvée" }

  const { error } = await supabase
    .from('folders')
    .insert({
      name: name,
      root_url: url,
      organization_id: member.organization_id,
      created_by: user.id
    })

  if (error) return { error: "Erreur base de données" }

  revalidatePath('/')
  return { success: true }
}

// --- 2. GESTION PROFILS & SETTINGS ---

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
      email: user.email 
    })

  if (error) return { error: "Erreur lors de la mise à jour du profil" }

  revalidatePath('/settings')
  return { success: "Profil mis à jour" }
}

export async function updateOrgSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Non connecté" }

  const apiKey = formData.get('apiKey') as string
  const orgId = formData.get('orgId') as string

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

  if (error) return { error: "Erreur lors de la sauvegarde de la clé API" }

  revalidatePath('/settings')
  return { success: "Paramètres d'organisation mis à jour" }
}

// --- 3. GESTION DES PAGES ---

export async function createPage(formData: FormData) {
  const supabase = await createClient()
  
  const url = formData.get('url') as string
  const name = formData.get('name') as string
  const folderId = formData.get('folderId') as string
  
  if (!url || !folderId) return { error: "URL requise" }

  const { error } = await supabase
    .from('pages')
    .insert({
      url,
      name: name || "Page sans nom",
      folder_id: folderId
    })

  if (error) return { error: "Erreur lors de l'ajout de la page" }
  
  revalidatePath(`/site/${folderId}`)
  return { success: "Page ajoutée" }
}

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

// --- 4. MOTEUR D'AUDIT (GLOBAL & UNITAIRE) ---

/**
 * Fonction interne privée qui exécute la logique technique d'un audit.
 */
async function _performAudit(url: string, folderId: string, apiKey: string, pageId: string | null = null) {
  const supabase = await createClient()
  const baseUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&category=performance&category=accessibility&category=best-practices&category=seo`
  
  try {
    const [mobileRes, desktopRes] = await Promise.all([
      fetch(`${baseUrl}&strategy=mobile`),
      fetch(`${baseUrl}&strategy=desktop`)
    ])

    const mobileData = await mobileRes.json()
    const desktopData = await desktopRes.json()

    // 1. Erreur API Globale (DNS, Timeout, etc.)
    if (mobileData.error || desktopData.error) {
        console.error(`Erreur API Google sur ${url}:`, mobileData.error)
        const errorCode = mobileData.error?.code || 500
        
        await supabase.from('audits').insert({
            folder_id: folderId,
            page_id: pageId,
            url: url,
            status_code: errorCode, 
            performance_score: 0,
            performance_desktop_score: 0,
            accessibility_score: 0,
            best_practices_score: 0,
            seo_score: 0,
            ttfb: 0,
            report_json: mobileData
        })
        return { success: true }
    }

    // 2. Extraction du VRAI code HTTP depuis Lighthouse
    const mAudits = mobileData.lighthouseResult.audits
    
    // L'audit 'http-status-code' contient le code réel si != 200
    const httpStatusAudit = mAudits['http-status-code']
    let statusCode = 200 // Par défaut on est optimiste

    // Si l'audit HTTP a échoué (score === 0), c'est qu'il y a une erreur (404, 500...)
    if (httpStatusAudit && httpStatusAudit.score === 0) {
       // La displayValue contient souvent "404" ou "Unsuccessful HTTP status code (404)"
       // On cherche le premier nombre de 3 chiffres
       const match = httpStatusAudit.displayValue?.match(/\b\d{3}\b/)
       if (match) {
         statusCode = parseInt(match[0], 10)
       } else {
         statusCode = 404 // Fallback si on arrive pas à lire le code mais que l'audit est KO
       }
    }

    // 3. Extraction des scores (Uniquement si on n'est pas en erreur critique)
    // Même en 404, Lighthouse peut donner des scores (sur la page 404), on les prend quand même
    // sauf si vous préférez tout mettre à 0. Ici je les laisse, mais le PageRow affichera l'erreur.
    
    const mCats = mobileData.lighthouseResult.categories
    const dCats = desktopData.lighthouseResult.categories

    const perfMobile = Math.round(mCats['performance']?.score * 100 || 0)
    const perfDesktop = Math.round(dCats['performance']?.score * 100 || 0)
    const accessScore = Math.round(mCats['accessibility']?.score * 100 || 0)
    const bestPracticesScore = Math.round(mCats['best-practices']?.score * 100 || 0)
    const seoScore = Math.round(mCats['seo']?.score * 100 || 0)
    const ttfb = Math.round(mAudits['server-response-time']?.numericValue || 0)
    
    const screenshot = mAudits['final-screenshot']?.details?.data
    const isHttps = mAudits['is-on-https']?.score === 1
    const isCrawlable = mAudits['is-crawlable']?.score === 1

    await supabase.from('audits').insert({
        folder_id: folderId,
        page_id: pageId,
        url: url,
        status_code: statusCode, // <--- C'est ici que le 404 sera enfin stocké
        https_valid: isHttps,
        indexable: isCrawlable,
        screenshot: screenshot,
        performance_score: perfMobile,
        performance_desktop_score: perfDesktop,
        accessibility_score: accessScore,
        best_practices_score: bestPracticesScore,
        seo_score: seoScore,
        ttfb: ttfb,
        report_json: mobileData
    })

    return { success: true }

  } catch (err) {
    console.error(`Crash audit ${url}:`, err)
    return { error: "Erreur technique lors de l'appel." }
  }
}


// Action 1 : Audit Unitaire (Bouton Play dans la liste)
export async function runPageSpeedAudit(url: string, folderId: string, pageId?: string) {
  const supabase = await createClient()
  
  const { data: folder } = await supabase
    .from('folders')
    .select('organization_id, organizations(google_api_key)')
    .eq('id', folderId)
    .single()

  // @ts-ignore
  const apiKey = folder?.organizations?.google_api_key || folder?.organizations?.[0]?.google_api_key
  if (!apiKey) return { error: "Clé API manquante" }

  const result = await _performAudit(url, folderId, apiKey, pageId || null)
  
  if (!pageId && result.success) {
    await supabase.from('folders').update({ status: 'up' }).eq('id', folderId)
  }

  revalidatePath(`/site/${folderId}`)
  return result
}

// Action 2 : Audit GLOBAL (Nouveau Bouton Flottant)
export async function runGlobalAudit(folderId: string) {
  const supabase = await createClient()

  // 1. Tout récupérer d'un coup (Dossier + Pages + Clé API)
  const { data: folder } = await supabase
    .from('folders')
    .select(`
        *,
        organizations (google_api_key),
        pages (*)
    `)
    .eq('id', folderId)
    .single()

  if (!folder) return { error: "Dossier introuvable" }

  // @ts-ignore
  const apiKey = folder.organizations?.google_api_key || folder.organizations?.[0]?.google_api_key
  if (!apiKey) return { error: "Clé API manquante" }

  const tasks = []

  // 2. Ajouter la racine (Root URL) à la liste des tâches
  tasks.push(_performAudit(folder.root_url, folder.id, apiKey, null))

  // 3. Ajouter toutes les sous-pages à la liste des tâches
  if (folder.pages && folder.pages.length > 0) {
    folder.pages.forEach((p: any) => {
        tasks.push(_performAudit(p.url, folder.id, apiKey, p.id))
    })
  }

  // 4. Exécution Parallèle (Attention, Google limite le débit, ok pour < 10 pages)
  try {
    await Promise.all(tasks)
    
    // Si au moins la racine est passée, on considère le site UP
    await supabase.from('folders').update({ status: 'up' }).eq('id', folderId)
    
    revalidatePath(`/site/${folderId}`)
    return { success: `Analyse terminée sur ${tasks.length} URL(s).` }
  } catch (e) {
    return { error: "Erreur lors de l'analyse globale." }
  }
}