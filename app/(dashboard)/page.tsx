import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Folder, FileText, AlertOctagon, Activity, Globe, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // --- LOGIQUE DATE & HEURE ---
  const now = new Date()
  const formattedDate = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hour = now.getHours()
  const greeting = hour >= 18 ? 'Bonsoir' : 'Bonjour'

  // 2. RÉCUPÉRATION DES DONNÉES (Folders + Pages + Audits associés)
  const [foldersRes, pagesRes, profileRes] = await Promise.all([
    // On récupère les dossiers et leurs audits pour vérifier la racine
    supabase.from('folders')
      .select('*, audits(id, status_code, created_at)')
      .order('created_at', { ascending: false }),
    
    // On récupère les pages et leurs audits pour vérifier les sous-pages
    supabase.from('pages')
      .select('*, audits(id, status_code, created_at)'),

    supabase.from('profiles').select('first_name').eq('id', user.id).single()
  ])

  const folders = foldersRes.data || []
  const pages = pagesRes.data || []
  
  // Nom d'affichage
  const profile = profileRes.data
  const userName = profile?.first_name || user.email?.split('@')[0] || 'Utilisateur'

  // --- 3. CALCUL DES INCIDENTS (Racines + Sous-pages) ---
  let totalIncidents = 0

  // Fonction helper pour vérifier si un tableau d'audits contient une erreur récente
  const hasError = (audits: any[]) => {
      if (!audits || audits.length === 0) return false
      // Tri du plus récent au plus ancien
      const last = audits.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      // Erreur si status 0 (Crash/DNS) ou >= 400 (HTTP Error)
      return last.status_code === 0 || last.status_code >= 400
  }

  // A. Vérification des Racines (Folders)
  const folderStatusMap: Record<string, number> = {}
  
  folders.forEach(folder => {
      // Calcul du statut pour l'affichage plus bas
      const lastAudit = folder.audits?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      if (lastAudit) {
          folderStatusMap[folder.id] = lastAudit.status_code
          if (hasError(folder.audits)) totalIncidents++
      }
  })

  // B. Vérification des Sous-pages (Pages)
  pages.forEach(page => {
      if (hasError(page.audits)) {
          totalIncidents++
      }
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      
      {/* --- HEADER --- */}
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
                Voici le rapport de performance et de disponibilité de vos infrastructures.
            </p>
        </div>
        
        {/* Résumé rapide (En haut à droite) */}
        <div className={`hidden md:flex items-center gap-6 text-sm font-medium px-4 py-2 rounded-full border 
            ${totalIncidents === 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}
        `}>
            {totalIncidents === 0 ? (
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Systèmes opérationnels
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    {totalIncidents} incident(s) détecté(s)
                </div>
            )}
        </div>
      </div>

      {/* --- 1. BLOC KPIs --- */}
      <div className="grid gap-4 md:grid-cols-3">
        
        {/* Carte 1 : Sites */}
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Sites suivis</CardTitle>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Folder className="h-4 w-4" /></div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-gray-900">{folders.length}</div>
                <p className="text-xs text-gray-500 mt-1">Projets actifs</p>
            </CardContent>
        </Card>

        {/* Carte 2 : Sous-pages */}
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Sous-pages</CardTitle>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><FileText className="h-4 w-4" /></div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-gray-900">{pages.length}</div>
                <p className="text-xs text-gray-500 mt-1">URLs surveillées</p>
            </CardContent>
        </Card>

        {/* Carte 3 : Incidents (CLIQUABLE) */}
        <Link href="/alerts" className="block h-full">
            <Card className={`h-full border shadow-sm transition-all cursor-pointer ${totalIncidents > 0 ? 'bg-red-50 border-red-200 hover:border-red-400' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className={`text-sm font-medium uppercase tracking-wider ${totalIncidents > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        Incidents
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${totalIncidents > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {totalIncidents > 0 ? <AlertOctagon className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className={`text-3xl font-bold ${totalIncidents > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                        {totalIncidents}
                    </div>
                    <p className={`text-xs mt-1 ${totalIncidents > 0 ? 'text-red-600/80 font-medium' : 'text-gray-500'}`}>
                        {totalIncidents > 0 ? "Erreurs critiques détectées" : "Tout est opérationnel"}
                    </p>
                </CardContent>
            </Card>
        </Link>
        
      </div>

      {/* --- 2. STATUTS SYSTÈMES --- */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-400" />
            Statuts Systèmes
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {folders.length > 0 ? (
             folders.map((folder) => {
                const status = folderStatusMap[folder.id]
                const hasAudit = status !== undefined
                
                // Logique stricte : Vert uniquement si 200 <= status < 400
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

                                    <div className={`text-[10px] font-medium mt-3 
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
                <p className="text-gray-500 mt-2 max-w-sm">Ajoutez votre premier site pour voir son statut apparaître ici en temps réel.</p>
             </div>
          )}
        </div>
      </div>

    </div>
  )
}