import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { Activity, Globe, ArrowRight, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { UptimeHistory, DailyStatus } from '@/components/UptimeHistory'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

// --- HELPER ---
function generate60DayHistory(audits: any[]): DailyStatus[] {
    const history: DailyStatus[] = []
    const today = new Date()
    
    // On normalise les audits par date
    const auditMap = new Map<string, any>()
    audits.forEach(a => {
        const dateKey = new Date(a.created_at).toISOString().split('T')[0]
        if (!auditMap.has(dateKey)) {
            auditMap.set(dateKey, a)
        }
    })

    // Boucle sur les 60 derniers jours
    for (let i = 59; i >= 0; i--) {
        const d = new Date()
        d.setDate(today.getDate() - i)
        const dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        const dateKey = d.toISOString().split('T')[0]
        
        const audit = auditMap.get(dateKey)

        if (audit) {
            const isUp = audit.status_code >= 200 && audit.status_code < 400
            history.push({
                date: dateStr,
                status: isUp ? 'up' : 'down',
                code: audit.status_code
            })
        } else {
            history.push({
                date: dateStr,
                status: 'empty'
            })
        }
    }
    return history
}

export default async function StatusPage() {
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
  const { data: folders } = await supabase
    .from('folders')
    .select(`
        id, name, root_url,
        audits (
            created_at, status_code
        )
    `)
    .eq('organization_id', activeOrgId)
    .order('name')

  // 3. Préparation des données
  const sitesStatus = (folders || []).map(folder => {
      const sortedAudits = folder.audits?.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ) || []

      return {
          id: folder.id,
          name: folder.name,
          url: folder.root_url,
          history: generate60DayHistory(sortedAudits)
      }
  })

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-10 pb-32">
      
      {/* HEADER */}
      <div className="flex flex-col gap-2 border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-600" />
            Statuts Systèmes
        </h1>
        <p className="text-gray-500 text-lg">
            Historique de disponibilité sur 60 jours pour l'ensemble de vos sites.
        </p>
      </div>

      {/* LISTE DES STATUTS - GRILLE COMPACTE */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {sitesStatus.length > 0 ? (
            sitesStatus.map((site) => (
                <Card key={site.id} className="shadow-sm border-gray-200 overflow-hidden hover:shadow-md hover:border-blue-200 transition-all group">
                    <CardContent className="p-4"> {/* Padding réduit */}
                        
                        {/* EN-TÊTE COMPACT */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex flex-col min-w-0 pr-2">
                                <Link href={`/site/${site.id}`} className="text-base font-bold text-gray-900 hover:text-blue-600 transition-colors truncate">
                                    {site.name}
                                </Link>
                                <a href={site.url} target="_blank" className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-1 w-fit mt-0.5 truncate">
                                    {site.url} <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                            </div>
                            
                            {/* BOUTON ACTION */}
                            <Button variant="outline" size="sm" className="h-8 text-xs shrink-0 bg-gray-50 hover:bg-white hover:text-blue-600 border-gray-200" asChild>
                                <Link href={`/site/${site.id}`}>
                                    Voir <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                            </Button>
                        </div>
                        
                        {/* HISTORIQUE */}
                        <div className="pt-2 border-t border-gray-50">
                            <UptimeHistory history={site.history} />
                        </div>
                    </CardContent>
                </Card>
            ))
        ) : (
            <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                Aucun site configuré pour le moment.
            </div>
        )}
      </div>
    </div>
  )
}
