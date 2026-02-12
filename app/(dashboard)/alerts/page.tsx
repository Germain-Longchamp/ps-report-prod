import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertOctagon, ArrowRight, Globe, Layout, CheckCircle2, History, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cookies } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function IncidentsPage() {
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

  // 2. Récupération des Données
  const [foldersRes, pagesRes] = await Promise.all([
    supabase.from('folders')
        .select('*, audits(status_code, created_at, url)') // On récupère TOUS les audits
        .eq('organization_id', activeOrgId),
    
    supabase.from('pages')
        .select('*, folders!inner(organization_id), audits(status_code, created_at, url)')
        .eq('folders.organization_id', activeOrgId)
  ])

  // 3. Traitement des Incidents
  const activeIncidents: any[] = []
  const pastIncidents: any[] = []

  // Fonction Helper pour traiter une ressource (Folder ou Page)
  const processResource = (resource: any, type: 'site' | 'page') => {
      const audits = resource.audits || []
      if (audits.length === 0) return

      // Tri du plus récent au plus ancien
      const sortedAudits = audits.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      const lastAudit = sortedAudits[0]

      // 1. Vérifier si incident ACTIF
      if (lastAudit.status_code === 0 || lastAudit.status_code >= 400) {
          activeIncidents.push({
              type,
              id: resource.id,
              name: resource.name,
              url: resource.root_url || resource.url, // root_url pour folder, url pour page
              statusCode: lastAudit.status_code,
              detectedAt: lastAudit.created_at,
              folderId: type === 'site' ? resource.id : resource.folder_id
          })
      }

      // 2. Vérifier l'historique (Incidents passés)
      // On prend les audits suivants (index 1 à n) qui sont en erreur
      // On limite à 10 derniers jours pour éviter de surcharger
      const limitDate = new Date()
      limitDate.setDate(limitDate.getDate() - 10)

      for (let i = 1; i < sortedAudits.length; i++) {
          const audit = sortedAudits[i]
          if (new Date(audit.created_at) < limitDate) break // Trop vieux

          if (audit.status_code === 0 || audit.status_code >= 400) {
              pastIncidents.push({
                  type,
                  id: resource.id,
                  name: resource.name,
                  url: resource.root_url || resource.url,
                  statusCode: audit.status_code,
                  detectedAt: audit.created_at,
                  folderId: type === 'site' ? resource.id : resource.folder_id
              })
          }
      }
  }

  // Traitement des Folders
  (foldersRes.data || []).forEach(f => processResource(f, 'site'));
  
  // Traitement des Pages
  (pagesRes.data || []).forEach(p => processResource(p, 'page'));

  // Tri final par date
  activeIncidents.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
  pastIncidents.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())

  // Limite d'affichage pour l'historique (ex: 20 derniers)
  const displayPastIncidents = pastIncidents.slice(0, 20)

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-12 pb-32">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
                Gestion des <span className="text-red-600">Incidents</span>
            </h1>
            <p className="text-gray-500 mt-2 text-lg max-w-2xl">
                Vue centralisée des erreurs actuelles et de l'historique récent.
            </p>
        </div>
        
        <div className="hidden md:flex items-center gap-3 mb-2">
             <span className="text-sm font-medium text-gray-500">En cours :</span>
             <span className={`px-4 py-1 rounded-full text-sm font-bold ${activeIncidents.length > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {activeIncidents.length}
             </span>
        </div>
      </div>

      {/* --- SECTION 1 : INCIDENTS ACTIFS --- */}
      <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
              <AlertOctagon className="h-5 w-5 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900">Incidents en cours</h2>
          </div>

          {activeIncidents.length > 0 ? (
            <div className="space-y-4">
                {activeIncidents.map((item, index) => (
                    <div 
                        key={`active-${item.type}-${item.id}-${index}`} 
                        className="group bg-white rounded-xl border border-red-200 shadow-sm hover:shadow-md hover:border-red-300 transition-all duration-200 p-1 flex items-stretch overflow-hidden"
                    >
                        <div className="w-1.5 bg-red-600 rounded-l-lg shrink-0" />
                        <div className="flex-1 flex flex-col md:flex-row md:items-center p-4 gap-6">
                            <div className="flex flex-col items-center justify-center h-14 w-16 bg-red-50 text-red-700 rounded-lg shrink-0 border border-red-100">
                                <span className="text-lg font-bold leading-none">{item.statusCode === 0 ? 'ERR' : item.statusCode}</span>
                                <span className="text-[10px] font-semibold uppercase opacity-80 mt-1">Erreur</span>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-1">
                                    {item.type === 'site' ? (
                                        <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200 font-normal gap-1 pl-1">
                                            <Globe className="h-3 w-3" /> Racine
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200 font-normal gap-1 pl-1">
                                            <Layout className="h-3 w-3" /> Page interne
                                        </Badge>
                                    )}
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-red-500 font-medium font-mono flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Depuis le {new Date(item.detectedAt).toLocaleDateString()} à {new Date(item.detectedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                                <h3 className="text-base font-bold text-gray-900 truncate">{item.name || "Ressource sans nom"}</h3>
                                <a href={item.url} target="_blank" className="text-sm text-gray-500 hover:text-blue-600 truncate transition-colors w-fit">{item.url}</a>
                            </div>
                            <div className="shrink-0 flex items-center">
                                <Link href={`/site/${item.folderId}`}>
                                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors group-hover:bg-gray-50">
                                        Diagnostiquer <ArrowRight className="h-4 w-4" />
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
                <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Aucun incident actif</h3>
                <p className="text-xs text-gray-500 mt-1">Tous vos services répondent correctement.</p>
            </div>
          )}
      </div>

      {/* --- SECTION 2 : HISTORIQUE RÉCENT --- */}
      <div className="space-y-4 pt-8 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
              <History className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-700">Historique récent (10 jours)</h2>
          </div>

          {displayPastIncidents.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayPastIncidents.map((item, index) => (
                    <div 
                        key={`past-${item.type}-${item.id}-${index}`} 
                        className="bg-white rounded-lg border border-gray-100 p-4 flex items-start gap-4 opacity-80 hover:opacity-100 transition-opacity"
                    >
                        <div className="flex flex-col items-center justify-center h-10 w-12 bg-gray-100 text-gray-500 rounded shrink-0 font-mono text-sm font-bold border border-gray-200">
                            {item.statusCode === 0 ? 'ERR' : item.statusCode}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-gray-900 truncate pr-2">{item.name}</h4>
                                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                    {new Date(item.detectedAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 truncate mt-0.5">{item.url}</div>
                        </div>
                    </div>
                ))}
             </div>
          ) : (
             <div className="text-sm text-gray-400 italic pl-1">Aucun incident archivé récemment.</div>
          )}
      </div>

    </div>
  )
}
