'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import https from 'https'

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

  // 1. Insérer la page et RÉCUPÉRER son ID (.select().single())
  const { data: newPage, error } = await supabase
    .from('pages')
    .insert({
      url,
      name: name || "Page sans nom",
      folder_id: folderId
    })
    .select() // Important : on veut récupérer l'objet créé
    .single()

  if (error || !newPage) {
    console.error(error)
    return { error: "Erreur lors de l'ajout de la page" }
  }

  // 2. Récupérer la Clé API (nécessaire pour l'audit)
  // On refait une petite requête pour chercher la clé liée au dossier
  const { data: folder } = await supabase
    .from('folders')
    .select('organization_id, organizations(google_api_key)')
    .eq('id', folderId)
    .single()

  // @ts-ignore
  const apiKey = folder?.organizations?.google_api_key || folder?.organizations?.[0]?.google_api_key

  // 3. Lancer l'audit immédiatement (si on a une clé)
  if (apiKey) {
    // On attend la fin de l'audit avant de renvoyer la réponse au client
    // Cela permet d'afficher les scores dès que la page se rafraîchit
    await _performAudit(url, folderId, apiKey, newPage.id)
  }

  revalidatePath(`/site/${folderId}`)
  return { success: "Page ajoutée et analysée !" }
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

// Fonction utilitaire pour récupérer la date d'expiration SSL
function getSSLExpiry(targetUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(targetUrl)
      if (urlObj.protocol !== 'https:') return resolve(null)

      const options = {
        hostname: urlObj.hostname,
        port: 443,
        method: 'HEAD',
        agent: new https.Agent({ maxCachedSessions: 0 }) // Pas de cache
      }

      const req = https.request(options, (res) => {
        const cert = (res.connection as any).getPeerCertificate()
        if (cert && cert.valid_to) {
          resolve(new Date(cert.valid_to).toISOString())
        } else {
          resolve(null)
        }
      })

      req.on('error', (e) => {
        console.error("Erreur SSL Check:", e)
        resolve(null)
      })

      req.end()
    } catch (e) {
      resolve(null)
    }
  })
}

/**
 * Fonction interne privée qui exécute la logique technique d'un audit.
 */
async function _performAudit(url: string, folderId: string, apiKey: string, pageId: string | null = null) {
  const supabase = await createClient()
  const baseUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&category=performance&category=accessibility&category=best-practices&category=seo`
  
  try {
    // 1. Parallélisation : Mobile + Desktop + Date SSL
    // On utilise { cache: 'no-store' } pour éviter l'erreur "Single item size exceeds maxSize" de Next.js
    const [mobileRes, desktopRes, sslDate] = await Promise.all([
      fetch(`${baseUrl}&strategy=mobile`, { cache: 'no-store' }),
      fetch(`${baseUrl}&strategy=desktop`, { cache: 'no-store' }),
      getSSLExpiry(url)
    ])

    const mobileData = await mobileRes.json()
    const desktopData = await desktopRes.json()

    // --- 2. GESTION DES ERREURS GLOBALES API (DNS, Timeout, 500 Google) ---
    if (mobileData.error || desktopData.error) {
        const errorMsg = (mobileData.error?.message || desktopData.error?.message || "Erreur inconnue").toLowerCase()
        console.error(`Erreur Google sur ${url}:`, errorMsg)

        let errorCode = 500 // Par défaut erreur serveur
        
        // On tente de deviner le code HTTP via le message d'erreur de Google
        if (errorMsg.includes("404") || errorMsg.includes("not found")) errorCode = 404
        else if (errorMsg.includes("403") || errorMsg.includes("forbidden")) errorCode = 403
        else if (errorMsg.includes("500")) errorCode = 500
        else if (errorMsg.includes("dns") || errorMsg.includes("resolve")) errorCode = 0 

        // Sauvegarde de l'audit en échec
        await supabase.from('audits').insert({
            folder_id: folderId,
            page_id: pageId,
            url: url,
            status_code: errorCode,
            https_valid: false,
            ssl_expiry_date: null,
            indexable: false,
            screenshot: null,
            performance_score: 0,
            performance_desktop_score: 0,
            accessibility_score: 0,
            best_practices_score: 0,
            seo_score: 0,
            ttfb: 0,
            report_json: mobileData // On garde l'erreur pour debug
        })

        return { success: true } 
    }

    // --- 3. EXTRACTION DU VRAI CODE HTTP (Lighthouse Analysis) ---
    const mAudits = mobileData.lighthouseResult.audits
    
    // L'audit 'http-status-code' contient le code réel si != 200
    const httpStatusAudit = mAudits['http-status-code']
    let statusCode = 200 // Optimiste par défaut

    if (httpStatusAudit && httpStatusAudit.score === 0) {
       // Ex: "Unsuccessful HTTP status code (404)" -> On extrait "404"
       const match = httpStatusAudit.displayValue?.match(/\b\d{3}\b/)
       if (match) {
         statusCode = parseInt(match[0], 10)
       } else {
         statusCode = 404
       }
    }

    // --- 4. EXTRACTION DES SCORES ---
    const mCats = mobileData.lighthouseResult.categories
    const dCats = desktopData.lighthouseResult.categories

    // Utilisation de ?.score pour éviter les crashs si une catégorie manque
    const perfMobile = Math.round(mCats['performance']?.score * 100 || 0)
    const perfDesktop = Math.round(dCats['performance']?.score * 100 || 0)
    const accessScore = Math.round(mCats['accessibility']?.score * 100 || 0)
    const bestPracticesScore = Math.round(mCats['best-practices']?.score * 100 || 0)
    const seoScore = Math.round(mCats['seo']?.score * 100 || 0)
    
    const ttfb = Math.round(mAudits['server-response-time']?.numericValue || 0)
    const screenshot = mAudits['final-screenshot']?.details?.data
    const isHttps = mAudits['is-on-https']?.score === 1
    const isCrawlable = mAudits['is-crawlable']?.score === 1

    // --- 5. INSERTION EN BASE ---
    await supabase.from('audits').insert({
        folder_id: folderId,
        page_id: pageId,
        url: url,
        status_code: statusCode, // 200, 404, 500...
        https_valid: isHttps,
        ssl_expiry_date: sslDate, // La date récupérée via Node.js
        indexable: isCrawlable,
        screenshot: screenshot,
        performance_score: perfMobile,
        performance_desktop_score: perfDesktop,
        accessibility_score: accessScore,
        best_practices_score: bestPracticesScore,
        seo_score: seoScore,
        ttfb: ttfb,
        report_json: mobileData // Le gros JSON pour le Side Panel
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


// --- 5. GESTION DU HEADER (UPDATE & DELETE) ---

export async function updateFolder(formData: FormData) {
  const supabase = await createClient()
  
  const folderId = formData.get('folderId') as string
  const name = formData.get('name') as string
  const rootUrl = formData.get('rootUrl') as string

  if (!folderId || !name || !rootUrl) return { error: "Données incomplètes" }

  const { error } = await supabase
    .from('folders')
    .update({ 
        name, 
        root_url: rootUrl 
    })
    .eq('id', folderId)

  if (error) return { error: "Erreur lors de la mise à jour." }

  revalidatePath(`/site/${folderId}`)
  return { success: "Site mis à jour avec succès." }
}

export async function deleteFolder(folderId: string) {
  const supabase = await createClient()
  
  // La suppression en cascade (cascade delete) dans Supabase devrait nettoyer les pages et audits
  // Si ce n'est pas configuré en SQL, il faudrait supprimer les enfants avant.
  // Supposons que votre table est bien faite (ON DELETE CASCADE).
  
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId)

  if (error) {
    console.error(error)
    return { error: "Impossible de supprimer le dossier." }
  }

  // Redirection vers le dashboard après suppression
  redirect('/')
}