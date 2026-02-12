import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { 
  AlertOctagon, 
  Activity, 
  Calendar, 
  CheckCircle2, 
  Server, 
  Layers, 
  Plus, 
  Building2,
  Clock // <--- Import Clock
} from 'lucide-react'
import { cookies } from 'next/headers'
import { CreateOrgModal } from '@/components/CreateOrgModal'
import { Button } from '@/components/ui/button'
import { DashboardSiteList } from '@/components/DashboardSiteList'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
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

  // CAS : NOUVEL UTILISATEUR SANS ORGANISATION
  if (validOrgIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-blue-50 p-4 rounded-full mb-6">
            <Server className="h-12 w-12 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Bienvenue sur PS Report</h1>
        <p className="text-gray-500 max-w-md mb-8">
          Pour commencer à monitorer vos sites, vous devez créer votre première organisation ou être invité dans une équipe.
        </p>
        <CreateOrgModal>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-5 w-5 mr-2" />
                Créer mon organisation
            </Button>
        </CreateOrgModal>
      </div>
    )
  }

  // 2. Récupérer l'organisation active
  const cookieStore = await cookies()
  let activeOrgId = Number(cookieStore.get('active_org_id')?.value)

  if (!activeOrgId || !validOrgIds.includes(activeOrgId)) {
      activeOrgId = validOrgIds[0]
  }

  // --- LOGIQUE DATE & HEURE ---
  const now = new Date()
  const formattedDate = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hour = now.getHours()
  const greeting = hour >= 18 ? 'Bonsoir' : 'Bonjour'

  // 3. RÉCUPÉRATION DES DONNÉES FILTRÉES
  const [foldersRes, pagesRes, profileRes, orgRes] = await Promise.all([
    supabase.from('folders')
      .select('*, audits(id, status_code, created_at, ssl_expiry_date)') 
      .eq('organization_id', activeOrgId)
      .order('created_at', { ascending: false }),
    
    supabase.from('pages')
      .select('*, folders!inner(organization_id), audits(id, status_code, created_at, performance_score, performance_desktop_score, accessibility_score, best_practices_score, seo_score)')
      .eq('folders.organization_id', activeOrgId),

    supabase.from('profiles').select('first_name').eq('id', user.id).single(),
    
    supabase.from('organizations').select('name').eq('id', activeOrgId).single()
  ])

  const folders = foldersRes.data || []
  const pages = pagesRes.data || []
  
  const profile = profileRes.data
  const userName = profile?.first_name || user.email?.split('@')[0] || 'Utilisateur'
  const orgName = orgRes.data?.name || "Organisation Active"

  // --- NOUVEAU : Récupération de la date du dernier audit ---
  let lastAuditDate: Date | null = null;
  folders.forEach(f => {
      if (f.audits && f.audits.length > 0) {
          const folderLast = new Date(f.audits[f.audits.length - 1].created_at); // Supposant trié ou on trie
          // On sécurise en triant pour être sûr
          const dates = f.audits.map((a: any) => new Date(a.created_at).getTime())
          const maxDate = Math.max(...dates)
          if (!lastAuditDate || maxDate > lastAuditDate.getTime()) {
              lastAuditDate = new Date(maxDate)
          }
      }
  })

  // Formatage de l'heure du dernier audit
  const lastAuditDisplay = lastAuditDate 
    ? `Dernier check : ${lastAuditDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    : 'En attente de données'


  // 4. CALCUL DES INCIDENTS & SANTÉ GLOBALE
  let totalIncidents = 0

  const hasError = (audits: any[]) => {
      if (!audits || audits.length === 0) return false
      const last = audits.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      return last.status_code === 0 || last.status_code >= 400
  }

  // CONSTANTES DE PONDÉRATION
  const WEIGHTS = {
    PERF_MOBILE: 3,
    PERF_DESKTOP: 2,
    SEO: 1,
    ACCESS: 1,
    BEST_PRACTICES: 1
  }

  const folderMetricsMap: Record<string, { status: number | undefined, healthScore: number | null, pageCount: number }> = {}

  folders.forEach(folder => {
      const lastAudit = folder.audits?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      let status = undefined
      if (lastAudit) {
          status = lastAudit.status_code
          if (hasError(folder.audits)) totalIncidents++
      }

      const sitePages = pages.filter(p => p.folder_id === folder.id)
      let healthScore: number | null = null
      
      if (sitePages.length > 0) {
          let totalWeightedScore = 0
          let analyzedPagesCount = 0

          sitePages.forEach((p: any) => {
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
              healthScore = Math.round(totalWeightedScore / analyzedPagesCount)
          }
      }

      folderMetricsMap[folder.id] = { 
          status, 
          healthScore, 
          pageCount: sitePages.length 
      }
  })

  pages.forEach(page => {
      if (hasError(page.audits)) totalIncidents++
  })

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-12 pb-32">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 shadow-sm">
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="text-sm font-semibold tracking-tight">{orgName}</span>
                </div>
                <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium uppercase tracking-wide">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="capitalize">{formattedDate}</span>
                </div>
                {/* --- NOUVEAU : INDICATEUR DERNIER AUDIT --- */}
                {lastAuditDate && (
                    <>
                        <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                        <div className="flex items-center gap-2 text-sm text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{lastAuditDisplay}</span>
                        </div>
                    </>
                )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                {greeting}, <span className="text-gray-600 font-normal">{userName}</span>
            </h1>
        </div>
        
        <div className={`hidden md:flex items-center gap-4 text-sm font-medium px-4 py-2 rounded-full border shadow-sm transition-colors
            ${totalIncidents === 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}
        `}>
            {totalIncidents === 0 ? (
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Systèmes opérationnels</span>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4 text-red-600" />
                    <span>{totalIncidents} incident(s) détecté(s)</span>
                </div>
            )}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid gap-6 md:grid-cols-3">
        
        <Card className="relative overflow-hidden border-blue-100 bg-gradient-to-br from-white to-blue-50/50 shadow-sm hover:shadow-md transition-all group">
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-semibold text-blue-900/60 uppercase tracking-wider mb-1">Sites Suivis</p>
                        <div className="text-4xl font-extrabold text-blue-950">{folders.length}</div>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                        <Server className="h-6 w-6" />
                    </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-blue-700 font-medium">
                    <span className="bg-blue-100 px-2 py-0.5 rounded text-xs mr-2">Actifs</span>
                    Projets monitorés
                </div>
            </CardContent>
            <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-blue-100/50 blur-2xl group-hover:bg-blue-200/50 pointer-events-none" />
        </Card>

        <Card className="relative overflow-hidden border-purple-100 bg-gradient-to-br from-white to-purple-50/50 shadow-sm hover:shadow-md transition-all group">
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-semibold text-purple-900/60 uppercase tracking-wider mb-1">Total URLs</p>
                        <div className="text-4xl font-extrabold text-purple-950">{pages.length}</div>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform">
                        <Layers className="h-6 w-6" />
                    </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-purple-700 font-medium">
                    <span className="bg-purple-100 px-2 py-0.5 rounded text-xs mr-2">Profondeur</span>
                    Sous-pages analysées
                </div>
            </CardContent>
            <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-purple-100/50 blur-2xl group-hover:bg-purple-200/50 pointer-events-none" />
        </Card>

        <Link href="/alerts" className="block h-full group">
            <Card className={`relative h-full overflow-hidden border shadow-sm hover:shadow-md transition-all
                ${totalIncidents > 0 
                    ? 'border-red-100 bg-gradient-to-br from-white to-red-50/50' 
                    : 'border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50'
                }
            `}>
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className={`text-sm font-semibold uppercase tracking-wider mb-1 ${totalIncidents > 0 ? 'text-red-900/60' : 'text-emerald-900/60'}`}>
                                État de santé
                            </p>
                            <div className={`text-4xl font-extrabold ${totalIncidents > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                {totalIncidents > 0 ? totalIncidents : "100%"}
                            </div>
                        </div>
                        <div className={`h-12 w-12 rounded-xl text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110
                             ${totalIncidents > 0 
                                ? 'bg-red-500 shadow-red-200' 
                                : 'bg-emerald-500 shadow-emerald-200'
                             }
                        `}>
                            {totalIncidents > 0 ? <AlertOctagon className="h-6 w-6" /> : <Activity className="h-6 w-6" />}
                        </div>
                    </div>
                    
                    <div className={`mt-4 flex items-center text-sm font-medium ${totalIncidents > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                        {totalIncidents > 0 ? (
                            <>
                                <span className="bg-red-100 px-2 py-0.5 rounded text-xs mr-2 animate-pulse">Attention</span>
                                Incidents critiques
                            </>
                        ) : (
                            <>
                                <span className="bg-emerald-100 px-2 py-0.5 rounded text-xs mr-2">Stable</span>
                                Tous systèmes OK
                            </>
                        )}
                    </div>
                </CardContent>
                <div className={`absolute -right-6 -bottom-6 h-24 w-24 rounded-full blur-2xl transition-colors pointer-events-none
                    ${totalIncidents > 0 ? 'bg-red-100/50 group-hover:bg-red-200/50' : 'bg-emerald-100/50 group-hover:bg-emerald-200/50'}
                `} />
            </Card>
        </Link>
        
      </div>

      {/* SECTION SITES (Déléguée au composant client) */}
      <DashboardSiteList folders={folders} metrics={folderMetricsMap} />

    </div>
  )
}
