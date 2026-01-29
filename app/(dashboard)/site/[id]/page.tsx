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
  HeartPulse,
  Info
} from 'lucide-react'
import { PageList } from '@/components/PageList'
import { RunAuditButton } from '@/components/RunAuditButton'
import { Card } from '@/components/ui/card'
import { SiteSettingsDialog } from '@/components/SiteSettingsDialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
  // MODIFICATION ICI : On récupère aussi les audits DU DOSSIER (Root URL)
  const { data: folder } = await supabase
    .from('folders')
    .select(`
        *, 
        audits (
            id, created_at, status_code, https_valid, ssl_expiry_date, 
            seo_score, screenshot, report_json
        ),
        pages (
            *,
            audits (
                id, created_at, status_code, ttfb,
                performance_score, performance_desktop_score,
                seo_score, best_practices_score, accessibility_score
            )
        )
    `)
    .eq('id', id)
    .eq('organization_id', activeOrgId)
    .single()

  if (!folder) redirect('/')

  const pages = folder.pages || []

  // --- 3. RÉCUPÉRATION DES DONNÉES RACINE (Depuis la DB uniquement) ---
  // On prend le dernier audit lié directement au folder (pas aux pages)
  const lastRootAudit = folder.audits?.sort((a: any, b: any) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0]

  // Données figées en base (Mises à jour uniquement via RunAuditButton)
  const liveStatus = lastRootAudit?.status_code || 0
  const isSiteUp = liveStatus >= 200 && liveStatus < 400
  const isSSLValid = lastRootAudit?.https_valid ?? false // Valeur DB
  const isIndexable = lastRootAudit ? (lastRootAudit.seo_score || 0) > 50 : false
  const screenshotUrl = lastRootAudit?.screenshot

  // --- 4. CALCUL DU SCORE GLOBAL PONDÉRÉ (Basé sur les SOUS-PAGES) ---
  // Reste inchangé : on calcule la moyenne des sous-pages pour la "Qualité Globale"
  let globalHealthScore: number | null = null
  let analyzedPagesCount = 0

  if (pages.length > 0) {
      let totalWeightedScore = 0
      
      const WEIGHTS = {
          PERF_MOBILE: 3,
          PERF_DESKTOP: 2,
          SEO: 1,
          ACCESS: 1,
          BEST_PRACTICES: 1
      }

      pages.forEach((p: any) => {
          const pLastAudit = p.audits?.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]

          if (pLastAudit) {
              analyzedPagesCount++
              if (pLastAudit.status_code < 400) {
                  let currentScoreSum = 0
                  let currentWeightSum = 0

                  if (pLastAudit.performance_score !== null) {
                      currentScoreSum += pLastAudit.performance_score * WEIGHTS.PERF_MOBILE
                      currentWeightSum += WEIGHTS.PERF_MOBILE
                  }
                  if (pLastAudit.performance_desktop_score !== null) {
                      currentScoreSum += pLastAudit.performance_desktop_score * WEIGHTS.PERF_DESKTOP
                      currentWeightSum += WEIGHTS.PERF_DESKTOP
                  }
                  if (pLastAudit.seo_score !== null) {
                      currentScoreSum += pLastAudit.seo_score * WEIGHTS.SEO
                      currentWeightSum += WEIGHTS.SEO
                  }
                  if (pLastAudit.accessibility_score !== null) {
                      currentScoreSum += pLastAudit.accessibility_score * WEIGHTS.ACCESS
                      currentWeightSum += WEIGHTS.ACCESS
                  }
                  if (pLastAudit.best_practices_score !== null) {
                      currentScoreSum += pLastAudit.best_practices_score * WEIGHTS.BEST_PRACTICES
                      currentWeightSum += WEIGHTS.BEST_PRACTICES
                  }

                  if (currentWeightSum > 0) {
                      const pageScore = currentScoreSum / currentWeightSum
                      totalWeightedScore += pageScore
                  }
              }
          }
      })

      if (analyzedPagesCount > 0) {
          globalHealthScore = Math.round(totalWeightedScore / analyzedPagesCount)
      }
  }

  // --- 5. LOGIQUE COULEURS & CHART ---
  const getScoreColorInfo = (score: number) => {
      if (score >= 80) return { color: 'text-emerald-500', stroke: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-100' }
      if (score >= 50) return { color: 'text-orange-500', stroke: '#f97316', bg: 'bg-orange-50', border: 'border-orange-100' }
      return { color: 'text-red-500', stroke: '#ef4444', bg: 'bg-red-50', border: 'border-red-100' }
  }

  const radius = 32
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = globalHealthScore !== null 
    ? circumference - (globalHealthScore / 100) * circumference 
    : circumference

  const theme = globalHealthScore !== null ? getScoreColorInfo(globalHealthScore) : { color: 'text-gray-300', stroke: '#e5e7eb', bg: 'bg-white', border: 'border-gray-200' }

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
              
              {/* 1. Carte Status (BASÉE SUR AUDIT BDD) */}
              <Card className={`border-0 shadow-sm flex flex-col justify-between p-6 h-full relative overflow-hidden transition-all duration-300
                  ${isSiteUp ? 'bg-emerald-600 text-white shadow-emerald-200' : (lastRootAudit ? 'bg-red-600 text-white shadow-red-200' : 'bg-gray-100 text-gray-500')}
              `}>
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                  
                  <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
                            Service
                          </span>
                          <div className="text-xl font-bold flex items-center gap-2">
                             {lastRootAudit 
                                ? (isSiteUp ? "En Ligne" : "Hors Ligne") 
                                : "En attente"}
                          </div>
                      </div>
                      <div className="relative flex h-3 w-3 mt-1.5">
                          {isSiteUp ? (
                            <>
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                            </>
                          ) : (
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${lastRootAudit ? 'bg-white' : 'bg-gray-400'}`}></span>
                          )}
                      </div>
                  </div>
                  <div className="mt-auto pt-2 flex items-center gap-2 text-sm font-medium opacity-90">
                      <Activity className="h-4 w-4" />
                      <span className="font-mono">
                         {lastRootAudit ? `CODE ${liveStatus}` : 'Aucun audit'}
                      </span>
                  </div>
              </Card>

              {/* 2. Carte Score Global (BASÉE SUR SOUS-PAGES) */}
              <Card className={`border shadow-sm flex flex-col p-6 h-full transition-all bg-white hover:shadow-md group relative overflow-visible ${theme.border}`}>
                  
                  <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${theme.bg} ${theme.color}`}>
                            <HeartPulse className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Qualité Globale</span>
                      </div>

                      <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-gray-300 hover:text-indigo-600 transition-colors cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[250px] bg-slate-900 text-slate-50 border-slate-800 p-3 text-xs leading-relaxed shadow-xl">
                                <p className="font-semibold mb-1">Score pondéré sur {analyzedPagesCount} page(s) :</p>
                                <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                                    <li>Mobile (x3)</li>
                                    <li>Desktop (x2)</li>
                                    <li>Autres (x1)</li>
                                </ul>
                            </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                  </div>
                  
                  <div className="flex-1 flex flex-col items-center justify-center py-2">
                      <div className="relative flex items-center justify-center">
                         <svg className="transform -rotate-90 w-24 h-24">
                            <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                            {globalHealthScore !== null && (
                                <circle cx="48" cy="48" r={radius} stroke={theme.stroke} strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                            )}
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                             {globalHealthScore !== null ? (
                                <span className={`text-2xl font-extrabold ${theme.color}`}>{globalHealthScore}</span>
                             ) : (
                                <span className="text-xl font-bold text-gray-300">--</span>
                             )}
                         </div>
                      </div>
                      <div className="mt-2 text-xs font-medium text-gray-400">
                         {globalHealthScore !== null 
                             ? (globalHealthScore >= 80 ? 'Excellent' : globalHealthScore >= 50 ? 'À améliorer' : 'Critique') 
                             : 'En attente'
                         }
                      </div>
                  </div>
              </Card>

              {/* 3. Carte SSL (BASÉE SUR AUDIT BDD) */}
              <Card className="border-gray-200 shadow-sm flex flex-col justify-center p-6 h-full hover:border-gray-300 transition-colors bg-white">
                  <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${isSSLValid ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                          <ShieldCheck className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold text-gray-600">Certificat SSL</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900 truncate">
                    {lastRootAudit ? (isSSLValid ? "Sécurisé" : "Invalide") : "--"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lastRootAudit ? (isSSLValid ? 'HTTPS actif' : 'Problème détecté') : 'Non vérifié'}
                  </p>
              </Card>

              {/* 4. Carte Indexation (BASÉE SUR AUDIT BDD) */}
              <Card className="border-gray-200 shadow-sm flex flex-col justify-center p-6 h-full hover:border-gray-300 transition-colors bg-white">
                  <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${isIndexable ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'}`}>
                          <SearchIcon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold text-gray-600">Indexation</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {lastRootAudit ? (isIndexable ? "Optimisé" : "À revoir") : "--"}
                  </div>
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
