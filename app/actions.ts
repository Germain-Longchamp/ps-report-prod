'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import https from 'https'

// --- UTILITAIRE : Récupérer l'ID Org Actif (Avec Fallback intelligent) ---
async function _getActiveOrgAndMember(supabase: any, userId: string) {
  const cookieStore = await cookies()
  let activeOrgId = Number(cookieStore.get('active_org_id')?.value)

  // Cas 1 : On a un cookie, on vérifie qu'il est toujours valide
  if (activeOrgId) {
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', userId)
      .eq('organization_id', activeOrgId)
      .single()

    // Si le membre existe bien pour cet ID, c'est gagné
    if (member) return { activeOrgId, member }
  }

  // Cas 2 : Pas de cookie OU le cookie est invalide (ex: on a été viré de l'orga)
  // => On lance le PLAN B : Chercher la première organisation dispo en base
  const { data: fallbackMember } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (fallbackMember) {
    // On a trouvé une orga de secours (celle créée à l'inscription par ex)
    return { 
        activeOrgId: fallbackMember.organization_id, 
        member: fallbackMember 
    }
  }

  // Cas 3 : Vraiment aucune organisation trouvée
  return { error: "Accès refusé. Vous n'êtes membre d'aucune organisation." }
}

// --- 1. GESTION ORGANISATION ---

export async function createOrganization(formData: FormData) {
  const supabase = await createClient()
  
  const orgName = formData.get('orgName') as string
  if (!orgName) return { error: "Nom requis" }

  const { data: newOrgId, error } = await supabase.rpc('create_org_with_owner', { 
    org_name: orgName 
  })

  if (error) {
    console.error('Erreur Create Org:', error)
    return { error: 'Impossible de créer l\'organisation.' }
  }

  // MODIFICATION ICI : On définit le cookie, mais on ne redirige PAS.
  // On renvoie le succès au client pour qu'il ferme la modale proprement.
  if (newOrgId) {
    const cookieStore = await cookies()
    cookieStore.set('active_org_id', newOrgId.toString(), {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30
    })
  }
  
  return { success: true } 
}

export async function switchOrganization(orgId: string) {
  const cookieStore = await cookies()
  cookieStore.set('active_org_id', orgId, {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30 // 30 jours
  })
  redirect('/') 
}

export async function updateOrgSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non connecté" }

  const apiKey = formData.get('apiKey') as string
  const orgId = formData.get('orgId') as string // Sécurité additionnelle

  // On vérifie que c'est bien l'org active et qu'on est membre
  const { activeOrgId, member, error } = await _getActiveOrgAndMember(supabase, user.id)
  if (error) return { error }

  // Sécurité double : on s'assure que l'ID du formulaire correspond au contexte
  if (String(activeOrgId) !== orgId) return { error: "Incohérence d'organisation." }

  const { error: updateError } = await supabase
    .from('organizations')
    .update({ google_api_key: apiKey })
    .eq('id', activeOrgId)

  if (updateError) return { error: "Erreur lors de la sauvegarde." }

  revalidatePath('/settings')
  return { success: "Paramètres mis à jour" }
}

// --- 2. GESTION DES DOSSIERS (SITES) ---

export async function createFolder(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non connecté." }

  const name = formData.get('name') as string
  const rootUrl = formData.get('rootUrl') as string

  if (!name || !rootUrl) return { error: "Nom et URL requis." }

  // 1. Récupérer l'org active sécurisée
  const { activeOrgId, error: authError } = await _getActiveOrgAndMember(supabase, user.id)
  if (authError) return { error: authError }

  // 2. Insertion dans l'org active
  const { data, error } = await supabase
    .from('folders')
    .insert({ 
        name, 
        root_url: rootUrl,
        organization_id: activeOrgId, // <-- ICI : On force l'ID actif
        created_by: user.id,
        status: 'active'
    })
    .select()
    .single()

  if (error) {
    console.error("Erreur Insert Folder:", error)
    return { error: "Impossible de créer le site." }
  }

  revalidatePath('/', 'layout') 
  return { success: true, id: data.id }
}

export async function updateFolder(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non connecté" }
  
  const folderId = formData.get('folderId') as string
  const name = formData.get('name') as string
  const rawUrl = formData.get('rootUrl') as string

  if (!folderId || !name || !rawUrl) return { error: "Données incomplètes" }

  // On vérifie que le folder appartient bien à une org dont on est membre
  // (Pas besoin de forcer l'org active ici, tant qu'on a le droit d'écrire sur ce folder via RLS ou check manuel)
  // Pour faire simple : on check si on a accès au folder via organization_members
  const { data: folder } = await supabase.from('folders').select('organization_id').eq('id', folderId).single()
  if (!folder) return { error: "Dossier introuvable" }

  const { data: access } = await supabase.from('organization_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('organization_id', folder.organization_id)
    .single()
  
  if (!access) return { error: "Droit refusé sur ce dossier." }

  // Nettoyage URL
  let cleanUrl = rawUrl.trim()
  if (!cleanUrl.startsWith('http')) {
    cleanUrl = `https://${cleanUrl}`
  }
  cleanUrl = cleanUrl.replace(/\/$/, '')

  const { error } = await supabase
    .from('folders')
    .update({ 
        name, 
        root_url: cleanUrl 
    })
    .eq('id', folderId)

  if (error) return { error: "Erreur lors de la mise à jour." }

  revalidatePath(`/site/${folderId}`)
  revalidatePath('/') 
  return { success: "Site mis à jour avec succès." }
}

export async function deleteFolder(folderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non connecté" }
  
  // Vérif droits (même logique que update)
  const { data: folder } = await supabase.from('folders').select('organization_id').eq('id', folderId).single()
  if (!folder) return { error: "Dossier introuvable" }

  const { data: access } = await supabase.from('organization_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('organization_id', folder.organization_id)
    .single()
  
  if (!access) return { error: "Droit refusé." }

  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId)

  if (error) return { error: "Impossible de supprimer le dossier." }

  revalidatePath('/', 'layout')
  redirect('/')
}

// --- 3. GESTION DES PAGES ---

export async function createPage(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non connecté" }
  
  const url = formData.get('url') as string
  const name = formData.get('name') as string
  const folderId = formData.get('folderId') as string
  
  if (!url || !folderId) return { error: "URL requise" }

  // Vérif droits sur le dossier parent
  const { data: folder } = await supabase
    .from('folders')
    .select('organization_id, organizations(google_api_key)')
    .eq('id', folderId)
    .single()

  if (!folder) return { error: "Dossier parent introuvable" }

  // Check membership
  const { data: access } = await supabase.from('organization_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('organization_id', folder.organization_id)
    .single()
  
  if (!access) return { error: "Accès refusé." }

  // Insertion
  const { data: newPage, error } = await supabase
    .from('pages')
    .insert({
      url,
      name: name || "Page sans nom",
      folder_id: folderId
    })
    .select()
    .single()

  if (error || !newPage) return { error: "Erreur ajout page" }

  // Lancer l'audit
  // @ts-ignore
  const apiKey = folder?.organizations?.google_api_key
  if (apiKey) {
    await _performAudit(url, folderId, apiKey, newPage.id)
  }

  revalidatePath(`/site/${folderId}`)
  return { success: "Page ajoutée et analysée !" }
}

export async function deletePage(pageId: string, folderId: string) {
  const supabase = await createClient()
  // Note: On pourrait ajouter une vérif de droits ici aussi pour être puriste
  
  const { error } = await supabase
    .from('pages')
    .delete()
    .eq('id', pageId)

  if (error) return { error: "Impossible de supprimer" }
  
  revalidatePath(`/site/${folderId}`)
  return { success: "Page supprimée" }
}

// --- 4. GESTION PROFIL ---

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

// --- 5. MOTEUR D'AUDIT (INCHANGÉ MAIS NÉCESSAIRE) ---

function getSSLExpiry(targetUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(targetUrl)
      if (urlObj.protocol !== 'https:') return resolve(null)

      const options = {
        hostname: urlObj.hostname,
        port: 443,
        method: 'HEAD',
        agent: new https.Agent({ maxCachedSessions: 0 }) 
      }

      const req = https.request(options, (res) => {
        const cert = (res.connection as any).getPeerCertificate()
        if (cert && cert.valid_to) {
          resolve(new Date(cert.valid_to).toISOString())
        } else {
          resolve(null)
        }
      })

      req.on('error', (e) => { resolve(null) })
      req.end()
    } catch (e) { resolve(null) }
  })
}

async function _performAudit(url: string, folderId: string, apiKey: string, pageId: string | null = null) {
  const supabase = await createClient()
  
  let realStatusCode = 0
  try {
    const checkRes = await fetch(url, { 
        method: 'GET',
        cache: 'no-store',
        redirect: 'follow'
    })
    realStatusCode = checkRes.status
  } catch (err) {
    console.error("Erreur Fetch:", err)
    realStatusCode = 0 
  }

  const baseUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&category=performance&category=accessibility&category=best-practices&category=seo`
  
  try {
    const [mobileRes, desktopRes, sslDate] = await Promise.all([
      fetch(`${baseUrl}&strategy=mobile`, { cache: 'no-store' }),
      fetch(`${baseUrl}&strategy=desktop`, { cache: 'no-store' }),
      getSSLExpiry(url)
    ])

    const mobileData = await mobileRes.json()
    const desktopData = await desktopRes.json()

    if (mobileData.error || desktopData.error) {
        const finalCode = realStatusCode !== 0 ? realStatusCode : 500
        await supabase.from('audits').insert({
            folder_id: folderId,
            page_id: pageId,
            url: url,
            status_code: finalCode,
            https_valid: false,
            report_json: mobileData
        })
        return { success: true, statusCode: finalCode } 
    }

    const mAudits = mobileData.lighthouseResult.audits
    const mCats = mobileData.lighthouseResult.categories
    const dCats = desktopData.lighthouseResult.categories

    const perfMobile = Math.round(mCats['performance']?.score * 100 || 0)
    const perfDesktop = Math.round(dCats['performance']?.score * 100 || 0)
    const accessScore = Math.round(mCats['accessibility']?.score * 100 || 0)
    const bestPracticesScore = Math.round(mCats['best-practices']?.score * 100 || 0)
    const seoScore = Math.round(mCats['seo']?.score * 100 || 0)
    
    const ttfb = Math.round(mAudits['server-response-time']?.numericValue || 0)
    const screenshot = mAudits['final-screenshot']?.details?.data
    const isHttps = url.startsWith('https://')
    const isCrawlable = mAudits['is-crawlable']?.score === 1

    await supabase.from('audits').insert({
        folder_id: folderId,
        page_id: pageId,
        url: url,
        status_code: realStatusCode,
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
    return { error: "Erreur technique." }
  }
}

export async function runPageSpeedAudit(url: string, folderId: string, pageId?: string) {
  const supabase = await createClient()
  
  const { data: folder } = await supabase
    .from('folders')
    .select('organization_id, organizations(google_api_key)')
    .eq('id', folderId)
    .single()

  // @ts-ignore
  const apiKey = folder?.organizations?.google_api_key
  if (!apiKey) return { error: "Clé API manquante" }

  const result = await _performAudit(url, folderId, apiKey, pageId || null)
  
  if (!pageId && result.success) {
      const newStatus = (result.statusCode && result.statusCode >= 400) ? 'issues' : 'active'
      await supabase.from('folders').update({ status: newStatus }).eq('id', folderId)
  }

  revalidatePath(`/site/${folderId}`)
  revalidatePath('/')
  return result
}

export async function runGlobalAudit(folderId: string) {
  const supabase = await createClient()

  const { data: folder } = await supabase
    .from('folders')
    .select(`*, organizations (google_api_key), pages (*)`)
    .eq('id', folderId)
    .single()

  if (!folder) return { error: "Dossier introuvable" }

  // @ts-ignore
  const apiKey = folder.organizations?.google_api_key
  if (!apiKey) return { error: "Clé API manquante" }

  const tasks = []
  tasks.push(_performAudit(folder.root_url, folder.id, apiKey, null))

  if (folder.pages && folder.pages.length > 0) {
    folder.pages.forEach((p: any) => {
        tasks.push(_performAudit(p.url, folder.id, apiKey, p.id))
    })
  }

  try {
    await Promise.all(tasks)
    revalidatePath(`/site/${folderId}`)
    revalidatePath('/')
    return { success: `Analyse terminée sur ${tasks.length} URL(s).` }
  } catch (e) {
    return { error: "Erreur lors de l'analyse globale." }
  }
}

export async function getAuditDetails(auditId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('audits').select('report_json').eq('id', auditId).single()
  if (error || !data) return { error: "Rapport introuvable" }
  return { report: data.report_json }
}


// --- 5. GESTION DES MEMBRES ---


export async function inviteMember(formData: FormData) {
  const supabase = await createClient()
  
  // 1. Auth Check basique
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non connecté" }

  const email = formData.get('email') as string
  if (!email) return { error: "Email requis" }

  // 2. Récupérer l'org active (via cookie)
  const cookieStore = await cookies()
  const activeOrgId = Number(cookieStore.get('active_org_id')?.value)
  
  if (!activeOrgId) return { error: "Aucune organisation active." }

  // 3. APPEL DE LA FONCTION SQL (Tout se fait là-dedans)
  const { data: result, error } = await supabase.rpc('add_member_by_email', {
    target_email: email,
    target_org_id: activeOrgId
  })

  if (error) {
    console.error("Erreur RPC:", error)
    return { error: "Erreur technique lors de l'ajout." }
  }

  // 4. Gestion des retours de la fonction SQL
  switch (result) {
    case 'success':
      revalidatePath('/settings')
      return { success: "Utilisateur ajouté à l'équipe !" }
    
    case 'user_not_found':
      return { error: "Aucun utilisateur trouvé avec cet email." }
    
    case 'already_member':
      return { error: "Cet utilisateur fait déjà partie de l'équipe." }
    
    case 'not_authorized':
      return { error: "Vous devez être Admin (Owner) pour ajouter des membres." }
      
    default:
      return { error: "Erreur inconnue." }
  }
}

export async function removeMember(formData: FormData) {
  const supabase = await createClient()
  
  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non connecté" }

  const targetUserId = formData.get('userId') as string
  
  // 2. Org Check
  const cookieStore = await cookies()
  const activeOrgId = Number(cookieStore.get('active_org_id')?.value)
  if (!activeOrgId) return { error: "Aucune organisation active" }

  // 3. Appel SQL (RPC)
  const { data: result, error } = await supabase.rpc('remove_org_member', {
    target_user_id: targetUserId,
    target_org_id: activeOrgId
  })

  if (error) {
    console.error("Erreur Remove:", error)
    return { error: "Erreur technique." }
  }

  if (result === 'not_authorized') {
    return { error: "Vous n'avez pas les droits pour faire ça." }
  }

  // 4. Important : Rafraîchir les données
  revalidatePath('/settings')
  return { success: "Membre retiré." }
}