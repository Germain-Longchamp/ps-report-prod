import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { Activity, Globe, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { UptimeHistory, DailyStatus } from '@/components/UptimeHistory'

export const dynamic = 'force-dynamic'

// --- HELPER (Identique à celui de la page détail) ---
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

  // 2. Data Fetching (Tous les sites + leurs audits)
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
      // On trie les audits pour le générateur
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

      {/* LISTE DES STATUTS */}
      <div className="grid gap-6">
        {sitesStatus.length > 0 ? (
            sitesStatus.map((site) => (
                <Card key={site.id} className="shadow-sm border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                            <div className="flex flex-col gap-1">
                                <Link href={`/site/${site.id}`} className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-2 group">
                                    {site.name}
                                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500" />
                                </Link>
                                <a href={site.url} target="_blank" className="text-sm text-gray-500 hover:text-blue-500 flex items-center gap-1 w-fit">
                                    <Globe className="h-3 w-3" />
                                    {site.url}
                                </a>
                            </div>
                        </div>
                        
                        {/* Composant Historique */}
                        <div className="pt-2 border-t border-gray-50">
                            <UptimeHistory history={site.history} />
                        </div>
                    </CardContent>
                </Card>
            ))
        ) : (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                Aucun site configuré pour le moment.
            </div>
        )}
      </div>
    </div>
  )
}
