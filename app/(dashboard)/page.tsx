import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Folder, 
  FileText, 
  AlertOctagon, 
  Activity, 
  Globe, 
  Calendar, 
  CheckCircle2, 
  Server, 
  Layers, 
  Plus, 
  ShieldCheck, 
  ArrowRight 
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
  const [foldersRes, pagesRes, profileRes] = await Promise.all([
    supabase.from('folders')
      .select('*, audits(id, status_code, created_at, ssl_expiry_date)') // Ajout de ssl_expiry_date
      .eq('organization_id', activeOrgId)
      .order('created_at', { ascending: false }),
    
    supabase.from('pages')
      .select('*, folders!inner(organization_id), audits(id, status_code, created_at)')
      .eq('folders.organization_id', activeOrgId),

    supabase.from('profiles').select('first_name').eq('id', user.id).single()
  ])

  const folders = foldersRes.data || []
  const pages = pagesRes.data || []
  
  const profile = profileRes.data
  const userName = profile?.first_name || user.email?.split('@')[0] || 'Utilisateur'

  // 4. CALCUL DES INCIDENTS
  let totalIncidents = 0

  const hasError = (audits: any[]) => {
      if (!audits || audits.length === 0) return false
      const last = audits.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      return last.status_code === 0 || last.status_code >= 400
  }

  const folderStatusMap: Record<string, number> = {}
  folders.forEach(folder => {
      const lastAudit = folder.audits?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      if (lastAudit) {
          folderStatusMap[folder.id] = lastAudit.status_code
          if (hasError(folder.audits)) totalIncidents++
      }
  })

  pages.forEach(page => {
      if (hasError(page.audits)) totalIncidents++
  })

  // 5. CALCUL DES CERTIFICATS SSL (Top 5 à renouveler)
  const upcomingExpirations = folders
    .map(folder => {
      // On prend le dernier audit
      const lastAudit = folder.audits?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      return {
        id: folder.id,
        name: folder.name,
        root_url: folder.root_url,
        ssl_expiry: lastAudit?.ssl_expiry_date,
        // Calcul du nombre de jours restants
        days_left: lastAudit?.ssl_expiry_date 
          ? Math.ceil((new Date(lastAudit.ssl_expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) 
          : null
      }
    })
    .filter(item => item.ssl_expiry) // On garde ceux qui ont une date
    .sort((a, b) => (a.days_left || 9999) - (b.days_left || 9999)) // Tri par expiration la plus proche
    .slice(0, 5) // On garde les 5 premiers

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium mb-2 uppercase tracking-wide">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="capitalize">{formattedDate}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
                {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 capitalize">{userName}</span>
            </h1>
            <p className="text-gray-500 mt-2 max-w-xl text-lg">
                Rapport de performance pour l'organisation active.
            </p>
        </div>
        
        <div className={`hidden md:flex items-center gap-6 text-sm font-medium px-4 py-2 rounded-full border shadow-sm transition-colors
            ${totalIncidents === 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}
        `}>
            {totalIncidents === 0 ? (
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Systèmes opérationnels
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4 text-red-600" />
                    {totalIncidents} incident(s) détecté(s)
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

      {/* STATUTS SYSTÈMES */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-gray-400" />
                Statuts Systèmes
            </h2>
            
            <CreateSiteModal>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un site
                </Button>
            </CreateSiteModal>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {folders.length > 0 ? (
             folders.map((folder) => {
                const status = folderStatusMap[folder.id]
                const hasAudit = status !== undefined
                const isOnline = hasAudit && (status >= 200 && status < 400)

                return (
                    <Link key={folder.id} href={`/site/${folder.id}`} className="group block h-full">
                        <Card className={`h-full border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer
                            ${hasAudit 
                                ? (isOnline ? 'border-gray-200 hover:border-emerald-400' : 'border-red-200 bg-red-50/30 hover:border-red-400') 
                                : 'border-gray-200 hover:border-blue-400'
                            }
                        `}>
                            <CardContent className="p-5 flex items-start gap-4">
                                <div className={`shrink-0 mt-1 h-3 w-3 rounded-full shadow-sm ring-4 transition-all duration-500
                                    ${hasAudit 
                                        ? (isOnline ? 'bg-emerald-500 ring-emerald-100 group-hover:ring-emerald-200' : 'bg-red-500 ring-red-100 animate-pulse') 
                                        : 'bg-gray-300 ring-gray-100'
                                    }
                                `} />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-bold text-gray-900 truncate text-sm">{folder.name}</h3>
                                        {hasAudit && (
                                            <Badge variant="outline" className={`text-[9px] h-4 px-1 font-mono
                                                ${isOnline ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}
                                            `}>
                                                {status === 0 ? 'ERR' : status}
                                            </Badge>
                                        )}
                                    </div>
                                    
                                    <div className="text-xs text-gray-500 truncate flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                                        <Globe className="h-2.5 w-2.5" />
                                        {folder.root_url}
                                    </div>

                                    <div className={`text-[10px] font-medium mt-3 flex items-center gap-1
                                        ${hasAudit 
                                            ? (isOnline ? 'text-emerald-600' : 'text-red-600') 
                                            : 'text-gray-400'
                                        }
                                    `}>
                                        {hasAudit 
                                            ? (isOnline ? "Opérationnel" : "Service perturbé") 
                                            : "En attente..."
                                        }
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

      {/* SECTION SSL */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-gray-400" />
                Certificats SSL
            </h2>
            <Link href="/ssl">
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                    Voir tout <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {upcomingExpirations.length > 0 ? (
                upcomingExpirations.map((site) => {
                    const daysLeft = site.days_left || 0
                    // Couleur dynamique selon l'urgence
                    let statusColor = "bg-emerald-100 text-emerald-800 border-emerald-200"
                    if (daysLeft < 7) statusColor = "bg-red-100 text-red-800 border-red-200 animate-pulse"
                    else if (daysLeft < 30) statusColor = "bg-orange-100 text-orange-800 border-orange-200"

                    return (
                        <Card key={site.id} className="border-gray-200 shadow-sm hover:shadow-md transition-all">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-semibold text-gray-900 truncate max-w-[120px]" title={site.name}>
                                        {site.name}
                                    </div>
                                    <Badge variant="outline" className={`${statusColor} text-[10px] px-1.5`}>
                                        J-{daysLeft}
                                    </Badge>
                                </div>
                                <div className="text-xs text-gray-500 truncate mb-3">
                                    {site.root_url}
                                </div>
                                <div className="text-xs font-medium text-gray-400 flex items-center gap-1">
                                    Expire le : 
                                    <span className="text-gray-700">
                                        {new Date(site.ssl_expiry).toLocaleDateString('fr-FR')}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })
            ) : (
                <div className="col-span-full py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200 text-gray-500 text-sm">
                    Aucune donnée SSL disponible pour le moment.
                </div>
            )}
        </div>
      </div>
    </div>
  )
}
