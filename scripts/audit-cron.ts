// scripts/audit-cron.ts
import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import https from 'https'
import 'dotenv/config'

// --- CONFIGURATION ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ ERREUR CRITIQUE : Variables d\'environnement manquantes.')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// --- HELPERS ---

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

            const req = https.request(options, (res: any) => {
                const cert = res.connection.getPeerCertificate()
                if (cert && cert.valid_to) {
                    resolve(new Date(cert.valid_to).toISOString())
                } else {
                    resolve(null)
                }
            })

            req.on('error', () => { resolve(null) })
            req.end()
        } catch (e) { resolve(null) }
    })
}

// Fonction d'audit unitaire avec RETRY et PROTECTION
async function performAudit(url: string, folderId: number, apiKey: string | null, pageId: string | null = null) {
    console.log(`🔍 Analyse : ${url} (PageID: ${pageId || 'Root'})`)

    // 1. Check Ping basique (Indicateur de vérité sur la disponibilité)
    let status = 0
    try {
        const res = await fetch(url, { method: 'HEAD' })
        status = res.status
    } catch (e) { status = 0 }

    const isSiteUp = status >= 200 && status < 400

    // 2. Boucle de Retry pour Lighthouse (3 tentatives max)
    let attempts = 0
    const maxAttempts = 3
    let success = false

    // URL API Google
    let baseUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&category=performance&category=accessibility&category=best-practices&category=seo`
    if (apiKey) baseUrl += `&key=${apiKey}`

    while (attempts < maxAttempts && !success) {
        attempts++
        try {
            if (attempts > 1) console.log(`   ... Tentative ${attempts}/${maxAttempts} pour ${url}`)

            const [mobRes, deskRes, sslDate] = await Promise.all([
                fetch(`${baseUrl}&strategy=mobile`),
                fetch(`${baseUrl}&strategy=desktop`),
                getSSLExpiry(url)
            ])

            // Si Google renvoie une erreur HTTP (ex: 429 Too Many Requests, 500 Server Error)
            if (!mobRes.ok || !deskRes.ok) {
                throw new Error(`Google API HTTP Error: ${mobRes.status} / ${deskRes.status}`)
            }

            const mobData: any = await mobRes.json()
            const deskData: any = await deskRes.json()

            // Vérification du contenu JSON
            if (mobData.error || deskData.error) {
                throw new Error(mobData.error?.message || deskData.error?.message || "Erreur analyse Lighthouse")
            }

            // SUCCÈS : On peut insérer en base
            const mCats = mobData.lighthouseResult.categories
            const dCats = deskData.lighthouseResult.categories
            const mAudits = mobData.lighthouseResult.audits
            
            await supabase.from('audits').insert({
                folder_id: folderId,
                page_id: pageId,
                url: url,
                status_code: status, // On utilise le statut réel du ping
                https_valid: url.startsWith('https'),
                ssl_expiry_date: sslDate,
                indexable: (mCats['seo']?.score * 100) > 50 && status === 200,
                performance_score: Math.round(mCats['performance']?.score * 100 || 0),
                performance_desktop_score: Math.round(dCats['performance']?.score * 100 || 0),
                seo_score: Math.round(mCats['seo']?.score * 100 || 0),
                accessibility_score: Math.round(mCats['accessibility']?.score * 100 || 0),
                best_practices_score: Math.round(mCats['best-practices']?.score * 100 || 0),
                ttfb: Math.round(mAudits['server-response-time']?.numericValue || 0),
                screenshot: mAudits['final-screenshot']?.details?.data,
                report_json: mobData
            })
            
            console.log(`✅ Succès : ${url}`)
            success = true

        } catch (err: any) {
            console.warn(`⚠️  Échec tentative ${attempts}:`, err.message)
            // Pause avant retry (2s, 4s...)
            if (attempts < maxAttempts) await new Promise(r => setTimeout(r, 2000 * attempts))
        }
    }

    // 3. Gestion de l'échec définitif après les retries
    if (!success) {
        if (isSiteUp) {
            // CAS CRITIQUE : Le site marche (Ping OK) mais l'outil d'analyse plante.
            // DÉCISION : ON N'INSÈRE RIEN.
            // Cela permet de garder le dernier audit valide sur le dashboard (pas d'incident affiché).
            console.error(`❌ Abandon audit sur ${url} (Le site est EN LIGNE, conservation du rapport précédent).`)
        } else {
            // Le site est vraiment DOWN (Ping KO) ou inaccessible.
            // On insère l'erreur pour alerter l'utilisateur (Incident légitime).
            console.error(`🔻 Site Hors Ligne ou Inaccessible : ${url}. Enregistrement de l'incident.`)
            
            await supabase.from('audits').insert({
                folder_id: folderId,
                page_id: pageId,
                url: url,
                status_code: status || 0, // 0 ou code erreur ping
                report_json: { error: "Échec analyse après retries (Site potentiellement down)" }
            })
        }
    }
}

// --- BOUCLE PRINCIPALE ---

async function run() {
    console.log('🚀 Démarrage du Cron PS Report (Mode Résilient)...')
    
    const { data: folders, error } = await supabase
        .from('folders')
        .select(`
            id, 
            root_url, 
            status,
            organizations (google_api_key),
            pages (id, url)
        `)
        .eq('status', 'active')

    if (error || !folders) {
        console.error('❌ Erreur récupération dossiers:', error)
        process.exit(1)
    }

    console.log(`📦 ${folders.length} sites à analyser.`)

    for (const folder of folders) {
        // @ts-ignore
        const apiKey = folder.organizations?.google_api_key || null
        
        console.log(`\n--- [Site ID: ${folder.id}] ${folder.root_url} ---`)

        // A. Audit URL Racine
        await performAudit(folder.root_url, folder.id, apiKey, null)
        await new Promise(r => setTimeout(r, 1000)) 

        // B. Audit Sous-pages
        if (folder.pages && folder.pages.length > 0) {
            for (const page of folder.pages) {
                await performAudit(page.url, folder.id, apiKey, page.id)
                await new Promise(r => setTimeout(r, 1000))
            }
        }
    }

    console.log('\n🏁 Cron terminé.')
    process.exit(0)
}

run()