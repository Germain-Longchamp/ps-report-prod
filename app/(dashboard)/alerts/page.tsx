import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertOctagon, ArrowRight, Globe, Layout, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cookies } from 'next/headers'

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

  // 2. Récupération des Données FILTRÉES
  const [foldersRes, pagesRes] = await Promise.all([
    supabase.from('folders')
        .select('*, audits!inner(status_code, created_at, url)')
        .eq('organization_id', activeOrgId),
    
    supabase.from('pages')
        .select('*, folders!inner(organization_id), audits!inner(status_code, created_at, url)')
        .eq('folders.organization_id', activeOrgId)
  ])

  // 3. Filtrage des Incidents
  const incidents: any[] = []

  // A. Sites Racine
  const folders = foldersRes.data || []
  folders.forEach((folder: any) => {
    const audits = folder.audits || []
    if (audits.length > 0) {
        const lastAudit = audits.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        
        if (lastAudit.status_code === 0 || lastAudit.status_code >= 400) {
            incidents.push({
                type: 'site',
                id: folder.id,
                name: folder.name,
                url: folder.root_url,
                statusCode: lastAudit.status_code,
                detectedAt: lastAudit.created_at,
                folderId: folder.id
            })
        }
    }
  })

  // B. Sous-pages
  const pages = pagesRes.data || []
  pages.forEach((page: any) => {
    const audits = page.audits || []
    if (audits.length > 0) {
        const lastAudit = audits.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        
        if (lastAudit.status_code === 0 || lastAudit.status_code >= 400) {
            incidents.push({
                type: 'page',
                id: page.id,
                name: page.name,
                url: page.url,
                statusCode: lastAudit.status_code,
                detectedAt: lastAudit.created_at,
                folderId: page.folder_id 
            })
        }
    }
  })

  // Tri : Plus récent en premier
  incidents.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())

  return (
    // MODIFICATION ICI : 'w-full' et 'p-12' pour l'homogénéité
    <div className="p-12 w-full space-y-10">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
                Gestion des <span className="text-red-600">Incidents</span>
            </h1>
            <p className="text-gray-500 mt-2 text-lg max-w-2xl">
                Vue centralisée des ressources en erreur (4xx/5xx). Ces problèmes impactent la visibilité et l'expérience utilisateur.
            </p>
        </div>
        
        {/* Compteur d'incidents à droite */}
        <div className="hidden md:flex items-center gap-3 mb-2">
             <span className="text-sm font-medium text-gray-500">Total actifs :</span>
             <span className={`px-4 py-1 rounded-full text-sm font-bold ${incidents.length > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {incidents.length} Incident{incidents.length > 1 ? 's' : ''}
             </span>
        </div>
      </div>

      {/* --- LISTE DES INCIDENTS --- */}
      {incidents.length > 0 ? (
        <div className="space-y-4">
            {incidents.map((item, index) => (
                <div 
                    key={`${item.type}-${item.id}-${index}`} 
                    className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-red-300 transition-all duration-200 p-1 flex items-stretch overflow-hidden"
                >
                    {/* Indicateur Latéral Gauche */}
                    <div className="w-1.5 bg-red-500 rounded-l-lg shrink-0" />

                    <div className="flex-1 flex flex-col md:flex-row md:items-center p-4 gap-6">
                        
                        {/* 1. STATUS CODE */}
                        <div className="flex flex-col items-center justify-center h-14 w-16 bg-red-50 text-red-700 rounded-lg shrink-0 border border-red-100">
                            <span className="text-lg font-bold leading-none">{item.statusCode === 0 ? 'ERR' : item.statusCode}</span>
                            <span className="text-[10px] font-semibold uppercase opacity-80 mt-1">Erreur</span>
                        </div>

                        {/* 2. INFOS */}
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
                                <span className="text-xs text-gray-400 font-mono">
                                    Détecté le {new Date(item.detectedAt).toLocaleDateString()} à {new Date(item.detectedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                            
                            <h3 className="text-base font-bold text-gray-900 truncate">
                                {item.name || "Ressource sans nom"}
                            </h3>
                            <a href={item.url} target="_blank" className="text-sm text-gray-500 hover:text-blue-600 truncate transition-colors w-fit">
                                {item.url}
                            </a>
                        </div>

                        {/* 3. ACTION */}
                        <div className="shrink-0 flex items-center">
                            <Link href={`/site/${item.folderId}`}>
                                <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors group-hover:bg-gray-50">
                                    Diagnostiquer
                                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      ) : (
        /* --- ÉTAT VIDE (SUCCESS) --- */
        <div className="flex flex-col items-center justify-center py-24 bg-gradient-to-b from-white to-emerald-50/30 border border-dashed border-emerald-100 rounded-3xl text-center">
            <div className="h-24 w-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-sm ring-8 ring-emerald-50">
                <CheckCircle2 className="h-12 w-12" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Aucun incident à signaler</h2>
            <p className="text-gray-500 mt-2 max-w-md">
                Excellente nouvelle ! L'ensemble de vos sites et pages répondent correctement (Code 200 OK).
            </p>
        </div>
      )}
    </div>
  )
}
