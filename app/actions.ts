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
  
  // 1. Vérification Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non connecté." }

  const name = formData.get('name') as string
  const rootUrl = formData.get('rootUrl') as string

  if (!name || !rootUrl) return { error: "Nom et URL requis." }

  // 2. Récupérer l'organisation
  const { data: memberLink, error: memberError } = await supabase
    .from('organization_members') 
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (memberError || !memberLink) {
    return { error: "Vous n'êtes lié à aucune organisation." }
  }

  // 3. Insertion
  const { data, error } = await supabase
    .from('folders')
    .insert({ 
        name, 
        root_url: rootUrl,
        organization_id: memberLink.organization_id,
        created_by: user.id,
        status: 'active'
    })
    .select()
    .single()

  if (error) {
    console.error("Erreur Insert Folder:", error)
    return { error: "Impossible de créer le site." }
  }

  // On invalide le cache du Layout (la Sidebar) pour tout le monde
  revalidatePath('/', 'layout') 

  return { success: true, id: data.id }
}

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
  
  // 1. Suppression
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId)

  if (error) {
    console.error(error)
    return { error: "Impossible de supprimer le dossier." }
  }

  // 2. On force la mise à jour de la Sidebar (Layout)
  revalidatePath('/', 'layout')

  // 3. Redirection vers l'accueil
  redirect('/')
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

  // 1. Insérer la page
  const { data: newPage, error } = await supabase
    .from('pages')
    .insert({
      url,
      name: name || "Page sans nom",
      folder_id: folderId
    })
    .select()
    .single()

  if (error || !newPage) {
    console.error(error)
    return { error: "Erreur lors de l'ajout de la page" }
  }

  // 2. Récupérer la Clé API
  const { data: folder } = await supabase
    .from('folders')
    .select('organization_id, organizations(google_api_key)')
    .eq('id', folderId)
    .single()

  // @ts-ignore
  const apiKey = folder?.organizations?.google_api_key || folder?.organizations?.[0]?.google_api_key

  // 3. Lancer l'audit immédiatement
  if (apiKey) {
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

// Fonction utilitaire pour récupérer la date d'expiration SSL via Node.js
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
        // Erreur silencieuse pour SSL, on renvoie null
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
 * INCLUT LE CORRECTIF 404/500
 */
async function _performAudit(url: string, folderId: string, apiKey: string, pageId: string | null = null) {
  const supabase = await createClient()
  
  // --- A. VERIFICATION DU VRAI CODE HTTP (FIX) ---
  // On le fait avant Google pour détecter les 404/500 même si Google répond 200
  let realStatusCode = 0
  try {
    const checkRes = await fetch(url, { 
        method: 'GET',
        cache: 'no-store', // Important: ne pas mettre en cache
        redirect: 'follow' // Suivre les redirections pour avoir le code final
    })
    realStatusCode = checkRes.status
  } catch (err) {
    console.error("Erreur Fetch préliminaire:", err)
    realStatusCode = 0 // Site inaccessible (DNS, Timeout...)
  }

  const baseUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&category=performance&category=accessibility&category=best-practices&category=seo`
  
  try {
    // 1. Parallélisation : Mobile + Desktop + Date SSL
    const [mobileRes, desktopRes, sslDate] = await Promise.all([
      fetch(`${baseUrl}&strategy=mobile`, { cache: 'no-store' }),
      fetch(`${baseUrl}&strategy=desktop`, { cache: 'no-store' }),
      getSSLExpiry(url)
    ])

    const mobileData = await mobileRes.json()
    const desktopData = await desktopRes.json()

    // --- 2. GESTION DES ERREURS GOOGLE ---
    if (mobileData.error || desktopData.error) {
        const errorMsg = (mobileData.error?.message || desktopData.error?.message || "Erreur inconnue").toLowerCase()
        console.error(`Erreur Google sur ${url}:`, errorMsg)

        // Si on a capturé un code réel au début, on l'utilise, sinon on devine ou met 500
        const finalCode = realStatusCode !== 0 ? realStatusCode : 500

        // Sauvegarde de l'audit en échec
        await supabase.from('audits').insert({
            folder_id: folderId,
            page_id: pageId,
            url: url,
            status_code: finalCode, // On utilise le vrai code
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

        return { success: true, statusCode: finalCode } 
    }

    // --- 3. EXTRACTION DES DONNÉES ---
    const mAudits = mobileData.lighthouseResult.audits
    const mCats = mobileData.lighthouseResult.categories
    const dCats = desktopData.lighthouseResult.categories

    // Scores
    const perfMobile = Math.round(mCats['performance']?.score * 100 || 0)
    const perfDesktop = Math.round(dCats['performance']?.score * 100 || 0)
    const accessScore = Math.round(mCats['accessibility']?.score * 100 || 0)
    const bestPracticesScore = Math.round(mCats['best-practices']?.score * 100 || 0)
    const seoScore = Math.round(mCats['seo']?.score * 100 || 0)
    
    const ttfb = Math.round(mAudits['server-response-time']?.numericValue || 0)
    const screenshot = mAudits['final-screenshot']?.details?.data
    const isHttps = url.startsWith('https://') // Simple check
    const isCrawlable = mAudits['is-crawlable']?.score === 1

    // --- 4. INSERTION EN BASE ---
    // C'est ici qu'on utilise 'realStatusCode' qu'on a capturé nous-mêmes
    await supabase.from('audits').insert({
        folder_id: folderId,
        page_id: pageId,
        url: url,
        status_code: realStatusCode, // <-- LE FIX EST ICI
        https_valid: isHttps,
        ssl_expiry_date: sslDate,
        indexable: isCrawlable && realStatusCode === 200,
        screenshot: screenshot,
        performance_score: perfMobile,
        performance_desktop_score: perfDesktop,
        accessibility_score: accessScore,
        best_practices_score: bestPracticesScore,
        seo_score: seoScore,
        ttfb: ttfb,
        report_json: mobileData
    })

    return { success: true, statusCode: realStatusCode }

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
  
  // Si c'est la racine (pas de pageId), on met à jour le statut global du dossier
  if (!pageId && result.success) {
      // Si code >= 400, on met 'issues', sinon 'active'
      const newStatus = (result.statusCode && result.statusCode >= 400) ? 'issues' : 'active'
      await supabase.from('folders').update({ status: newStatus }).eq('id', folderId)
  }

  revalidatePath(`/site/${folderId}`)
  revalidatePath('/')
  return result
}

// Action 2 : Audit GLOBAL (Bouton Flottant)
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

  // 2. Ajouter la racine (Root URL)
  tasks.push(_performAudit(folder.root_url, folder.id, apiKey, null))

  // 3. Ajouter toutes les sous-pages
  if (folder.pages && folder.pages.length > 0) {
    folder.pages.forEach((p: any) => {
        tasks.push(_performAudit(p.url, folder.id, apiKey, p.id))
    })
  }

  // 4. Exécution
  try {
    const results = await Promise.all(tasks)
    
    // Logique optionnelle : Si la racine a un code erreur, on passe le site en 'issues'
    const rootResult = results[0] // Le premier est toujours la racine
    if (rootResult && rootResult.statusCode && rootResult.statusCode >= 400) {
        await supabase.from('folders').update({ status: 'issues' }).eq('id', folderId)
    } else {
        await supabase.from('folders').update({ status: 'active' }).eq('id', folderId)
    }
    
    revalidatePath(`/site/${folderId}`)
    revalidatePath('/')
    return { success: `Analyse terminée sur ${tasks.length} URL(s).` }
  } catch (e) {
    return { error: "Erreur lors de l'analyse globale." }
  }
}

// --- 7. RÉCUPÉRATION DU DÉTAIL AUDIT (LAZY LOAD) ---

export async function getAuditDetails(auditId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('audits')
    .select('report_json')
    .eq('id', auditId)
    .single()

  if (error || !data) return { error: "Rapport introuvable" }
  
  return { report: data.report_json }
}