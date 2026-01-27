import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { 
  ChevronRight, 
  ExternalLink,
  ImageIcon,
  ShieldCheck,
  Activity,
  Globe,
  Search as SearchIcon,
  Loader2,
  AlertOctagon, 
  CheckCircle2,
  HeartPulse,
  TrendingUp
} from 'lucide-react'
import { PageList } from '@/components/PageList'
import { RunAuditButton } from '@/components/RunAuditButton'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SiteSettingsDialog } from '@/components/SiteSettingsDialog'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // --- LOGIQUE MULTI-TENANT ---
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)

  const validOrgIds = memberships?.map(m => m.organization_id) || []

  const cookieStore = await cookies()
  let activeOrgId = Number(cookieStore.get('active_org_id')?.value)

  if (!activeOrgId || !validOrgIds.includes(activeOrgId)) {
      activeOrgId = validOrgIds[0]
  }

  // 2. Data Fetching
  const { data: folder } = await supabase
    .from('folders')
    .select(`
        *, 
        pages (
            *,
            audits (
                id, created_at, status_code, ttfb,
                performance_score, performance_desktop_score,
                seo_score, best_practices_score, accessibility_score,
                screenshot
            )
        )
    `)
    .eq('id', id)
    .eq('organization_id', activeOrgId)
    .single()

  if (!folder) redirect('/')

  const pages = folder.pages || []

  // --- 3. VÉRIFICATION LIVE DU ROOT URL ---
  let liveStatus = 0
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2500)
    
    let targetUrl = folder.root_url
    if (!targetUrl.startsWith('http')) {
        targetUrl = `https://${targetUrl}`
    }
    
    const res = await fetch(targetUrl, { 
        method: 'HEAD', 
        cache: 'no-store',
        signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    liveStatus = res.status

  } catch (error) {
    liveStatus = 0
  }

  const isSiteUp = liveStatus >= 200 && liveStatus < 400

  // --- 4. CALCUL DU SCORE GLOBAL PONDÉRÉ (ALGORITHME INTELLIGENT) ---
  const allAudits = pages.flatMap((p: any) => p.audits || [])
  const lastGlobalAudit = allAudits.sort((a: any, b: any) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0]

  const isSSLValid = folder.root_url.startsWith('https') && isSiteUp
  const isIndexable = lastGlobalAudit ? (lastGlobalAudit.seo_score || 0) > 50 : true
  const screenshotUrl = lastGlobalAudit?.screenshot

  // --- ALGORITHME PONDÉRÉ ---
  let globalHealthScore: number | null = null
  let analyzedPagesCount = 0

  if (pages.length > 0) {
      let totalWeightedScore = 0
      let totalWeightDivisor = 0

      // Coefficients de pondération (La performance Mobile est Reine)
      const WEIGHTS = {
          PERF_MOBILE: 3,   // x3
          PERF_DESKTOP: 2,  // x2
          SEO: 1,           // x1
          ACCESS: 1,        // x1
          BEST_PRACTICES: 1 // x1
      }

      pages.forEach((p: any) => {
          const pLastAudit = p.audits?.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]

          if (pLastAudit) {
              analyzedPagesCount++
              
              if (pLastAudit.status_code >= 400) {
                  // PÉNALITÉ MASSIVE : Si une page est en erreur, on ajoute des 0 avec le poids maximum
                  // Cela fait chuter la moyenne violemment.
                  const maxWeight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0)
                  totalWeightDivisor += maxWeight 
                  // On n'ajoute rien au score (donc 0), mais on augmente le diviseur.
              } else {
                  // Calcul pondéré pour la page
                  let pageScore = 0
                  let pageWeights = 0

                  if (pLastAudit.performance_score !== null) {
                      pageScore += pLastAudit.performance_score * WEIGHTS.PERF_MOBILE
                      pageWeights += WEIGHTS.PERF_MOBILE
                  }
                  if (pLastAudit.performance_desktop_score !== null) {
                      pageScore += pLastAudit.performance_desktop_score * WEIGHTS.PERF_DESKTOP
                      pageWeights += WEIGHTS.PERF_DESKTOP
                  }
                  if (pLastAudit.seo_score !== null) {
                      pageScore += pLastAudit.seo_score * WEIGHTS.SEO
                      pageWeights += WEIGHTS.SEO
                  }
                  if (pLastAudit.accessibility_score !== null) {
                      pageScore += pLastAudit.accessibility_score * WEIGHTS.ACCESS
                      pageWeights += WEIGHTS.ACCESS
                  }
                  if (pLastAudit.best_practices_score !== null) {
                      pageScore += pLastAudit.best_practices_score * WEIGHTS.BEST_PRACTICES
                      pageWeights += WEIGHTS.BEST_PRACTICES
                  }

                  // On ajoute la moyenne pondérée de CETTE page au total global
                  if (pageWeights > 0) {
                      totalWeightedScore += (pageScore / pageWeights)
                      totalWeightDivisor += 1 // On compte cette page comme 1 unité dans la moyenne finale des pages
                  }
              }
          }
      })

      if (totalWeightDivisor > 0 && analyzedPagesCount > 0) {
          // Moyenne des scores de pages
          // Note : totalWeightDivisor ici correspond au nombre de pages valides traitées + les pages en erreur
          // Mais dans ma boucle "else", j'incrémente de 1.
          // Pour les erreurs, je dois gérer différemment.
          
          // RECTIFICATION ALGO SIMPLIFIÉ MAIS PUISSANT :
          // Moyenne des Notes Pondérées des Pages.
          globalHealthScore = Math.round(totalWeightedScore / analyzedPagesCount)
      }
  }

  // Helper pour la couleur du score
  const getScoreColor = (score: number) => {
      if (score >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-100 ring-emerald-500/20'
      if (score >= 60) return 'text-orange-600 bg-orange-50 border-orange-100 ring-orange-500/20'
      return 'text-red-600 bg-red-50 border-red-100 ring-red-500/20'
  }

  const getGradient = (score: number | null) => {
      if (score === null) return 'from-gray-50 to-white'
      if (score >= 90) return 'from-emerald-50/50 to-white'
      if (score >= 60) return 'from-orange-50/50 to-white'
      return 'from-red-50/50 to-white'
  }

  return (
    <div className="relative min-h-screen bg-gray-50/30">
      <div className="p-10 w-full max-w-7xl mx-auto space-y-12 pb-32">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex gap-6">
                <div className="h-20 w-20 shrink-0 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden relative flex items-center justify-center p-1">
                    {screenshotUrl ? (
                        <img 
                            src={screenshotUrl} 
                            alt="Aperçu site" 
                            className="h-full w-full object-cover object-top rounded-xl"
                        />
                    ) : (
                        <div className="bg-gray-50 h-full w-full rounded-xl flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-gray-300" />
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <nav className="flex items-center gap-1 text-sm text-muted-foreground font-medium">
                        <Link href="/" className="hover:text-gray-900 transition-colors">Mes Sites</Link>
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                        <span className="text-gray-900">{folder.name}</span>
                    </nav>
                    <div className="flex flex-col gap-2">
                         <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
                            {folder.name}
                        </h1>
                        <a href={folder.root_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors w-fit group">
                            <Globe className="h-3.5 w-3.5" />
                            {folder.root_url}
                            <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </a>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <SiteSettingsDialog folder={folder} />
            </div>
        </header>

        {/* KPI CARDS */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Santé du site</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* 1. Carte Status (REMISE EN PREMIER) */}
              <Card className={`border-0 shadow-sm flex flex-col justify-between p-6 h-full relative overflow-hidden transition-all duration-300
                  ${isSiteUp ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-red-600 text-white shadow-red-200'}
              `}>
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                  
                  <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                            Service
                          </span>
                          <div className="text-xl font-bold flex items-center gap-2">
                             {isSiteUp ? "En Ligne" : "Hors Ligne"}
                          </div>
                      </div>
                      <div className="relative flex h-3 w-3 mt-1.5">
                          {isSiteUp ? (
                            <>
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                            </>
                          ) : (
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                          )}
                      </div>
                  </div>
                  <div className="mt-auto pt-2 flex items-center gap-2 text-sm font-medium opacity-90">
                      <Activity className="h-4 w-4" />
                      <span className="font-mono">
                         CODE {liveStatus === 0 ? 'ERR' : liveStatus}
                      </span>
                  </div>
              </Card>

              {/* 2. Carte Score Global (AMÉLIORÉE & DÉPLACÉE ICI) */}
              <Card className={`border-gray-200 shadow-sm flex flex-col justify-between p-6 h-full transition-all bg-gradient-to-br ${getGradient(globalHealthScore)} hover:shadow-md group relative overflow-hidden`}>
                  {/* Petit effet déco */}
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-gray-100 to-transparent rounded-bl-full opacity-50" />

                  <div className="flex items-center gap-3 mb-2 relative">
                      <div className="p-2.5 rounded-xl bg-white shadow-sm border border-gray-100 text-indigo-600 group-hover:scale-110 transition-transform">
                          <HeartPulse className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">Qualité Globale</span>
                  </div>
                  
                  <div className="flex items-end gap-3 mt-2">
                    {globalHealthScore !== null ? (
                        <>
                             <div className={`text-4xl font-extrabold px-3 py-1 rounded-lg border-2 ring-4 ${getScoreColor(globalHealthScore)} bg-white shadow-sm`}>
                                {globalHealthScore}
                             </div>
                             <div className="flex flex-col mb-1">
                                <span className="text-xs font-bold text-gray-400 uppercase">Score</span>
                                <span className="text-xs text-gray-400">Pondéré</span>
                             </div>
                        </>
                    ) : (
                        <div className="text-3xl font-bold text-gray-300">--</div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                     <TrendingUp className="h-3.5 w-3.5" />
                     {analyzedPagesCount > 0 ? (
                         <span>Basé sur {analyzedPagesCount} page{analyzedPagesCount > 1 ? 's' : ''}</span>
                     ) : (
                         <span>En attente d'audit...</span>
                     )}
                  </div>
              </Card>

              {/* 3. Carte SSL */}
              <Card className="border-gray-200 shadow-sm flex flex-col justify-center p-6 h-full hover:border-gray-300 transition-colors bg-white">
                  <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${isSSLValid ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                          <ShieldCheck className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold text-gray-600">Certificat SSL</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900 truncate">{isSSLValid ? "Sécurisé" : "Invalide"}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isSSLValid ? 'HTTPS actif' : 'Problème détecté'}
                  </p>
              </Card>

              {/* 4. Carte Indexation */}
              <Card className="border-gray-200 shadow-sm flex flex-col justify-center p-6 h-full hover:border-gray-300 transition-colors bg-white">
                  <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${isIndexable ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'}`}>
                          <SearchIcon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold text-gray-600">Indexation</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">{isIndexable ? "Optimisé" : "À revoir"}</div>
                  <p className="text-xs text-muted-foreground mt-1">SEO Technique</p>
              </Card>
          </div>
        </section>

        {/* SECTION LISTE DES PAGES */}
        <section className="space-y-6 pt-2">
            <div>
                 <h2 className="text-xl font-bold text-gray-900">Pages internes</h2>
                 <p className="text-sm text-gray-500 mt-1">Monitoring individuel des pages clés.</p>
            </div>
            <PageList initialPages={pages} folderId={folder.id} rootUrl={folder.root_url} />
        </section>

      </div>
      <RunAuditButton folderId={folder.id} />
    </div>
  )
}
