// scripts/audit-cron.ts
import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import https from 'https'
import 'dotenv/config'

// --- CONFIGURATION ---
// On utilise les variables d'environnement standard
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ ERREUR CRITIQUE : Variables d\'environnement manquantes.')
    console.error('Assurez-vous que NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définies.')
    process.exit(1)
}

// Initialisation du client Supabase en mode ADMIN (contourne les règles RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// --- FONCTIONS UTILITAIRES ---

// Récupération expiration SSL (Node.js natif)
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

// Fonction d'audit unitaire
async function performAudit(url: string, folderId: number, apiKey: string | null, pageId: string | null = null) {
    console.log(`🔍 Analyse : ${url} (PageID: ${pageId || 'Root'})`)

    // 1. Check Ping basique (Status Code)
    let status = 0
    try {
        const res = await fetch(url, { method: 'HEAD' })
        status = res.status
    } catch (e) { status = 0 }

    // 2. Construction URL Lighthouse
    let baseUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&category=performance&category=accessibility&category=best-practices&category=seo`
    
    // Ajout de la clé si disponible
    if (apiKey) baseUrl += `&key=${apiKey}`

    try {
        // Exécution parallèle (Mobile + Desktop + SSL)
        const [mobRes, deskRes, sslDate] = await Promise.all([
            fetch(`${baseUrl}&strategy=mobile`),
            fetch(`${baseUrl}&strategy=desktop`),
            getSSLExpiry(url)
        ])

        const mobData: any = await mobRes.json()
        const deskData: any = await deskRes.json()

        // Gestion des erreurs API Google (Quotas, URL invalide, etc.)
        if (mobData.error || deskData.error) {
            const errorMsg = mobData.error?.message || deskData.error?.message
            console.warn(`⚠️  Alerte Google sur ${url} : ${errorMsg}`)
            
            // On sauvegarde l'état "Erreur" pour le suivi
            await supabase.from('audits').insert({
                folder_id: folderId,
                page_id: pageId,
                url: url,
                status_code: status || 500, // Si ping a échoué, on met 500
                https_valid: false,
                report_json: { error: errorMsg }
            })
            return
        }

        // Extraction des scores (Lighthouse v5 structure)
        const mCats = mobData.lighthouseResult.categories
        const dCats = deskData.lighthouseResult.categories
        const mAudits = mobData.lighthouseResult.audits
        
        await supabase.from('audits').insert({
            folder_id: folderId,
            page_id: pageId,
            url: url,
            status_code: status,
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
            report_json: mobData // On garde le JSON complet mobile
        })
        console.log(`✅ Succès : ${url}`)

    } catch (err) {
        console.error(`💥 Crash script sur ${url}:`, err)
        // Log de secours
        await supabase.from('audits').insert({
            folder_id: folderId,
            page_id: pageId,
            url: url,
            status_code: 0,
            report_json: { error: "Cron Script Crash" }
        })
    }
}

// --- BOUCLE PRINCIPALE ---

async function run() {
    console.log('🚀 Démarrage du Cron PS Report...')
    
    // 1. Récupérer tous les dossiers actifs avec leur clé API via l'Organisation
    // Note : On utilise `!inner` ou jointure standard pour récupérer la clé
    const { data: folders, error } = await supabase
        .from('folders')
        .select(`
            id, 
            root_url, 
            status,
            organizations (google_api_key),
            pages (id, url)
        `)
        .eq('status', 'active') // Optionnel: ne traiter que les sites actifs

    if (error || !folders) {
        console.error('❌ Erreur lors de la récupération des dossiers:', error)
        process.exit(1)
    }

    console.log(`📦 ${folders.length} sites à analyser.`)

    // 2. Itération séquentielle pour ménager l'API
    for (const folder of folders) {
        // @ts-ignore
        const apiKey = folder.organizations?.google_api_key || null
        
        console.log(`\n--- [Site ID: ${folder.id}] ${folder.root_url} ---`)
        if (!apiKey) console.log("   (Info: Pas de clé API, mode limité)")

        // A. Audit URL Racine
        await performAudit(folder.root_url, folder.id, apiKey, null)
        
        // Pause "politesse" de 2 secondes
        await new Promise(r => setTimeout(r, 2000)) 

        // B. Audit des Sous-pages
        if (folder.pages && folder.pages.length > 0) {
            console.log(`   > ${folder.pages.length} sous-pages détectées...`)
            for (const page of folder.pages) {
                await performAudit(page.url, folder.id, apiKey, page.id)
                await new Promise(r => setTimeout(r, 2000)) // Pause entre pages
            }
        }
    }

    console.log('\n🏁 Cron terminé avec succès.')
    process.exit(0)
}

run()