import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Folder,
  AlertOctagon, 
  Activity, 
  Globe, 
  Calendar, 
  CheckCircle2, 
  Server, 
  Layers, 
  Plus, 
  BarChart3,
  Building2,
  Lock, 
  Unlock 
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cookies } from 'next/headers'
import { CreateOrgModal } from '@/components/CreateOrgModal'
import { CreateSiteModal } from '@/components/CreateSiteModal'
import { Button } from '@/components/ui/button'

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
    // MODIFICATION ICI : 'w-full' et 'p-12' pour uniformiser avec la page SSL
    <div className="w-full p-12 space-y-10">
      
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

      {/* SECTION SITES */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-gray-400" />
                Vos Sites
            </h2>
            
            <CreateSiteModal>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un site
                </Button>
            </CreateSiteModal>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {folders.length > 0 ? (
             folders.map((folder) => {
                const metrics = folderMetricsMap[folder.id]
                const status = metrics?.status
                const healthScore = metrics?.healthScore
                const pageCount = metrics?.pageCount || 0

                const hasAudit = status !== undefined
                const isOnline = hasAudit && (status >= 200 && status < 400)

                let scoreColor = "text-gray-600 bg-gray-100 border-gray-200"
                if (healthScore !== null) {
                    if (healthScore >= 80) scoreColor = "text-emerald-700 bg-emerald-50 border-emerald-200"
                    else if (healthScore >= 60) scoreColor = "text-orange-700 bg-orange-50 border-orange-200"
                    else scoreColor = "text-red-700 bg-red-50 border-red-200"
                }

                const lastAudit = folder.audits?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                const sslExpiry = lastAudit?.ssl_expiry_date ? new Date(lastAudit.ssl_expiry_date) : null
                const sslDaysLeft = sslExpiry ? Math.ceil((sslExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
                const isSslOk = sslDaysLeft !== null && sslDaysLeft > 30 

                const cardStyle = hasAudit 
                    ? (isOnline 
                        ? 'border-gray-200 bg-gradient-to-br from-white to-gray-50/50 hover:to-white hover:border-emerald-400' 
                        : 'border-red-200 bg-red-50/30 hover:border-red-400') 
                    : 'border-gray-200 bg-gradient-to-br from-white to-gray-50/50 hover:to-white hover:border-blue-400'

                return (
                    <Link key={folder.id} href={`/site/${folder.id}`} className="group block h-full">
                        <Card className={`h-full border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${cardStyle}`}>
                            <CardContent className="p-5 flex flex-col gap-4">
                                
                                <div className="flex items-start gap-3">
                                    <div className={`shrink-0 mt-1 h-3 w-3 rounded-full shadow-sm ring-4 transition-all duration-500
                                        ${hasAudit 
                                            ? (isOnline ? 'bg-emerald-500 ring-emerald-100 group-hover:ring-emerald-200' : 'bg-red-500 ring-red-100 animate-pulse') 
                                            : 'bg-gray-300 ring-gray-100'
                                        }
                                    `} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-bold text-gray-900 truncate text-sm">{folder.name}</h3>
                                            {healthScore !== null && (
                                                <Badge variant="outline" className={`text-[10px] h-5 px-1.5 font-bold flex items-center gap-1 ${scoreColor}`}>
                                                    <BarChart3 className="h-3 w-3" />
                                                    {healthScore}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                                            <Globe className="h-2.5 w-2.5" />
                                            {folder.root_url}
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-gray-100 w-full" />

                                <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                                    
                                    <div className="flex items-center gap-1.5" title={sslExpiry ? `Expire le ${sslExpiry.toLocaleDateString()}` : "Pas d'info SSL"}>
                                        {sslDaysLeft !== null ? (
                                            <>
                                                {isSslOk ? (
                                                    <Lock className="h-3.5 w-3.5 text-emerald-500" />
                                                ) : (
                                                    <Lock className="h-3.5 w-3.5 text-red-500" />
                                                )}
                                                <span className={!isSslOk ? "text-red-600 font-bold" : ""}>
                                                    J-{sslDaysLeft}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <Unlock className="h-3.5 w-3.5 text-gray-300" />
                                                <span className="text-gray-400">SSL --</span>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                        <Layers className="h-3.5 w-3.5 text-gray-400" />
                                        <span>{pageCount} page{pageCount > 1 ? 's' : ''}</span>
                                    </div>

                                </div>

                            </CardContent>
                        </Card>
                    </Link>
                )
             })
          ) : (
             <div className="col-span-full py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/30">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                    <Folder className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Aucun système monitoré</h3>
                <p className="text-gray-500 mt-2 max-w-sm">
                    Cette organisation est vide. Ajoutez votre premier site pour commencer.
                </p>
             </div>
          )}
        </div>
      </div>

    </div>
  )
}
