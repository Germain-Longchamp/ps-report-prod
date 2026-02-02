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

  // Cas 1 : Cookie présent
  if (activeOrgId) {
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', userId)
      .eq('organization_id', activeOrgId)
      .single()

    if (member) return { activeOrgId, member }
  }

  // Cas 2 : Fallback
  const { data: fallbackMember } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (fallbackMember) {
    return { 
        activeOrgId: fallbackMember.organization_id, 
        member: fallbackMember 
    }
  }

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

export async function updateOrgName(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non connecté" }

  const orgName = formData.get('orgName') as string
  const orgId = formData.get('orgId') as string

  if (!orgName || !orgName.trim()) return { error: "Le nom ne peut pas être vide." }

  const { activeOrgId, error } = await _getActiveOrgAndMember(supabase, user.id)
  if (error) return { error }

  if (String(activeOrgId) !== orgId) return { error: "Incohérence d'organisation." }

  const { error: updateError } = await supabase
    .from('organizations')
    .update({ name: orgName })
    .eq('id', activeOrgId)

  if (updateError) return { error: "Erreur technique lors de la mise à jour." }

  revalidatePath('/settings')
  revalidatePath('/', 'layout') 
  return { success: "Organisation renommée avec succès." }
}

export async function switchOrganization(orgId: string) {
  const cookieStore = await cookies()
  cookieStore.set('active_org_id', orgId, {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30 
  })
  redirect('/') 
}

export async function updateOrgSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non connecté" }

  const apiKey = formData.get('apiKey') as string
  const orgId = formData.get('orgId') as string

  const { activeOrgId, error } = await _getActiveOrgAndMember(supabase, user.id)
  if (error) return { error }

  if (String(activeOrgId) !== orgId) return { error: "Incohérence d'organisation." }

  const { error: updateError } = await supabase
    .from('organizations')
    .update({ google_api_key: apiKey })
    .eq('id', activeOrgId)

  if (updateError) return { error: "Erreur lors de la sauvegarde." }

  revalidatePath('/settings')
  return { success: "Paramètres mis à jour" }
}

export async function deleteOrganization(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non connecté" }

  const orgId = formData.get('orgId') as string
  if (!orgId) return { error: "ID manquant" }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'owner') {
      return { error: "Seul le propriétaire peut supprimer l'organisation." }
  }

  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', orgId)

  if (error) return { error: "Impossible de supprimer l'organisation." }

  const cookieStore = await cookies()
  cookieStore.delete('active_org_id')

  redirect('/')
}

// --- 2. GESTION DES DOSSIERS (SITES) ---

export async function createFolder(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non connecté." }

  const name = formData.get('name') as string
  let rootUrl = formData.get('rootUrl') as string

  if (!name || !rootUrl) return { error: "Nom et URL requis." }

  // 1. Nettoyage URL
  rootUrl = rootUrl.trim()
  if (!rootUrl.startsWith('http')) {
      rootUrl = `https://${rootUrl}`
  }
  rootUrl = rootUrl.replace(/\/$/, '')

  // 2. Auth & Org Check
  const { activeOrgId, error: authError } = await _getActiveOrgAndMember(supabase, user.id)
  if (authError || !activeOrgId) return { error: authError || "Aucune organisation active." }

  const { data: orgData } = await supabase
    .from('organizations')
    .select('google_api_key')
    .eq('id', activeOrgId)
    .single()

  // 3. Insertion
  const { data: folder, error } = await supabase
    .from('folders')
    .insert({ 
        name, 
        root_url: rootUrl,
        organization_id: activeOrgId,
        created_by: user.id,
        status: 'active'
    })
    .select()
    .single()

  if (error) {
    console.error("Erreur Insert Folder:", error)
    return { error: "Impossible de créer le site." }
  }

  // 4. LANCEMENT AUDIT IMMÉDIAT
  try {
      const apiKey = orgData?.google_api_key || null
      await _performAudit(rootUrl, folder.id, apiKey, null) 
  } catch (auditError) {
      console.error("Warning: Audit initial échoué mais site créé.", auditError)
  }

  revalidatePath('/', 'layout') 
  return { success: true, id: folder.id }
}

export async function updateFolder(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non connecté" }
  
  const folderId = formData.get('folderId') as string
  const name = formData.get('name') as string
  const rawUrl = formData.get('rootUrl') as string

  if (!folderId || !name || !rawUrl) return { error: "Données incomplètes" }

  const { data: folder } = await supabase.from('folders').select('organization_id').eq('id', folderId).single()
  if (!folder) return { error: "Dossier introuvable" }

  const { data: access } = await supabase.from('organization_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('organization_id', folder.organization_id)
    .single()
  
  if (!access) return { error: "Droit refusé sur ce dossier." }

  let cleanUrl = rawUrl.trim()
  if (!cleanUrl.startsWith('http')) {
    cleanUrl = `https://${cleanUrl}`
  }
  cleanUrl = cleanUrl.replace(/\/$/, '')

  const { error } = await supabase
    .from('folders')
    .update({ name, root_url: cleanUrl })
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

  const { data: folder } = await supabase
    .from('folders')
    .select('organization_id, organizations(google_api_key)')
    .eq('id', folderId)
    .single()

  if (!folder) return { error: "Dossier parent introuvable" }

  const { data: access } = await supabase.from('organization_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('organization_id', folder.organization_id)
    .single()
  
  if (!access) return { error: "Accès refusé." }

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

  // @ts-ignore
  const apiKey = folder?.organizations?.google_api_key || null
  try {
      await _performAudit(url, folderId, apiKey, newPage.id)
  } catch (e) {
      console.error("Audit page failed", e)
  }

  revalidatePath(`/site/${folderId}`)
  return { success: "Page ajoutée et analysée !" }
}

export async function updatePageName(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non connecté" }

  const pageId = formData.get('pageId') as string
  const name = formData.get('name') as string
  const folderId = formData.get('folderId') as string

  if (!pageId || !name) return { error: "Données manquantes" }

  const { data: page } = await supabase.from('pages').select('folder_id').eq('id', pageId).single()
  if (!page) return { error: "Page introuvable" }

  const { data: folder } = await supabase.from('folders').select('organization_id').eq('id', page.folder_id).single()
  if (!folder) return { error: "Dossier parent introuvable" }

  const { data: access } = await supabase.from('organization_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('organization_id', folder.organization_id)
    .single()

  if (!access) return { error: "Action non autorisée" }

  const { error } = await supabase
    .from('pages')
    .update({ name })
    .eq('id', pageId)

  if (error) return { error: "Erreur lors du renommage" }

  revalidatePath(`/site/${folderId}`)
  return { success: "Page renommée avec succès" }
}

export async function deletePage(pageId: string, folderId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('pages').delete().eq('id', pageId)
  if (error) return { error: "Impossible de supprimer" }
  revalidatePath(`/site/${folderId}`)
  return { success: "Page supprimée" }
}

export async function createPagesBulk(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non connecté" }
  
  const folderId = formData.get('folderId') as string
  const pagesJson = formData.get('pagesJson') as string
  
  if (!folderId || !pagesJson) return { error: "Données manquantes" }

  const pagesToCreate = JSON.parse(pagesJson) as { name: string, url: string }[]

  const { data: folder } = await supabase
    .from('folders')
    .select('organization_id, organizations(google_api_key)')
    .eq('id', folderId)
    .single()

  if (!folder) return { error: "Dossier introuvable" }

  const { data: access } = await supabase.from('organization_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('organization_id', folder.organization_id)
    .single()
  
  if (!access) return { error: "Accès refusé." }

  const { data: newPages, error } = await supabase
    .from('pages')
    .insert(
        pagesToCreate.map(p => ({
            url: p.url,
            name: p.name,
            folder_id: folderId
        }))
    )
    .select()

  if (error || !newPages) {
      console.error("Bulk Insert Error:", error)
      return { error: "Erreur lors de la création des pages" }
  }

  // @ts-ignore
  const apiKey = folder?.organizations?.google_api_key || null

  const auditPromises = newPages.map(page => 
      _performAudit(page.url, folderId, apiKey, page.id)
  )
  
  try {
      await Promise.all(auditPromises)
  } catch (e) {
      console.error("Bulk audit error (non-blocking)")
  }

  revalidatePath(`/site/${folderId}`)
  return { success: true, count: newPages.length }
}

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

// --- 5. MOTEUR D'AUDIT (CORRIGÉ & ROBUSTE) ---

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

async function _performAudit(url: string, folderId: string, apiKey: string | null, pageId: string | null = null) {
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
    console.error("Erreur Fetch Initial:", err)
    realStatusCode = 0 
  }

  let baseUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&category=performance&category=accessibility&category=best-practices&category=seo`
  if (apiKey) baseUrl += `&key=${apiKey}`

  try {
    // MODIF: Timeout augmenté à 60s pour éviter AbortError
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) 

    const [mobileRes, desktopRes, sslDate] = await Promise.all([
      fetch(`${baseUrl}&strategy=mobile`, { cache: 'no-store', signal: controller.signal }),
      fetch(`${baseUrl}&strategy=desktop`, { cache: 'no-store', signal: controller.signal }),
      getSSLExpiry(url)
    ])
    clearTimeout(timeoutId)

    const mobileData = await mobileRes.json()
    const desktopData = await desktopRes.json()

    if (mobileData.error || desktopData.error) {
        console.error("Lighthouse API Error:", mobileData.error || desktopData.error)
        const finalCode = realStatusCode !== 0 ? realStatusCode : 500
        await supabase.from('audits').insert({
            folder_id: folderId,
            page_id: pageId,
            url: url,
            status_code: finalCode,
            https_valid: false,
            report_json: mobileData.error || desktopData.error || { error: "Unknown API error" }
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

  } catch (err: any) {
    console.error(`Audit error ${url}:`, err)
    
    const errorMsg = err.name === 'AbortError' ? "Timeout audit (>60s)" : "Crash serveur ou API"
    
    // On log l'erreur pour ne pas bloquer l'UI
    await supabase.from('audits').insert({
        folder_id: folderId,
        page_id: pageId,
        url: url,
        status_code: 0,
        report_json: { error: errorMsg }
    })
    
    return { error: "Erreur technique." }
  }
}

// FONCTION RENOMMÉE POUR FORCER LE REBUILD (Anciennement runPageSpeedAudit)
export async function forceRunPageSpeedAudit(url: string, folderId: string, pageId?: string) {
  const supabase = await createClient()
  
  const { data: folder } = await supabase
    .from('folders')
    .select('organization_id, organizations(google_api_key)')
    .eq('id', folderId)
    .single()

  // @ts-ignore
  const apiKey = folder?.organizations?.google_api_key || null
  
  const result = await _performAudit(url, folderId, apiKey, pageId || null)
  
  if (!pageId && result.success) {
      const newStatus = (result.statusCode && result.statusCode >= 400) ? 'issues' : 'active'
      await supabase.from('folders').update({ status: newStatus }).eq('id', folderId)
  }

  revalidatePath(`/site/${folderId}`)
  revalidatePath('/')
  return result
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non connecté" }

  const email = formData.get('email') as string
  if (!email) return { error: "Email requis" }

  const cookieStore = await cookies()
  const activeOrgId = Number(cookieStore.get('active_org_id')?.value)
  
  if (!activeOrgId) return { error: "Aucune organisation active." }

  const { data: result, error } = await supabase.rpc('add_member_by_email', {
    target_email: email,
    target_org_id: activeOrgId
  })

  if (error) return { error: "Erreur technique lors de l'ajout." }

  switch (result) {
    case 'success':
      revalidatePath('/settings')
      return { success: "Utilisateur ajouté à l'équipe !" }
    case 'user_not_found': return { error: "Aucun utilisateur trouvé avec cet email." }
    case 'already_member': return { error: "Cet utilisateur fait déjà partie de l'équipe." }
    case 'not_authorized': return { error: "Vous devez être Admin (Owner) pour ajouter des membres." }
    default: return { error: "Erreur inconnue." }
  }
}

export async function removeMember(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non connecté" }

  const targetUserId = formData.get('userId') as string
  const cookieStore = await cookies()
  const activeOrgId = Number(cookieStore.get('active_org_id')?.value)
  if (!activeOrgId) return { error: "Aucune organisation active" }

  const { data: result, error } = await supabase.rpc('remove_org_member', {
    target_user_id: targetUserId,
    target_org_id: activeOrgId
  })

  if (error) return { error: "Erreur technique." }
  if (result === 'not_authorized') return { error: "Vous n'avez pas les droits." }

  revalidatePath('/settings')
  return { success: "Membre retiré." }
}
