import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { Activity, Globe, ExternalLink, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { UptimeHistory, DailyStatus } from '@/components/UptimeHistory'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

function generate60DayHistory(audits: any[]): DailyStatus[] {
    const history: DailyStatus[] = []
    const today = new Date()
    const auditMap = new Map<string, any>()
    audits.forEach(a => {
        const dateKey = new Date(a.created_at).toISOString().split('T')[0]
        if (!auditMap.has(dateKey)) auditMap.set(dateKey, a)
    })

    for (let i = 59; i >= 0; i--) {
        const d = new Date()
        d.setDate(today.getDate() - i)
        const dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        const dateKey = d.toISOString().split('T')[0]
        const audit = auditMap.get(dateKey)

        if (audit) {
            const isUp = audit.status_code >= 200 && audit.status_code < 400
            history.push({ date: dateStr, status: isUp ? 'up' : 'down', code: audit.status_code })
        } else {
            history.push({ date: dateStr, status: 'empty' })
        }
    }
    return history
}

export default async function StatusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberships } = await supabase.from('organization_members').select('organization_id').eq('user_id', user.id)
  const validOrgIds = memberships?.map(m => m.organization_id) || []
  const cookieStore = await cookies()
  let activeOrgId = Number(cookieStore.get('active_org_id')?.value)
  if (!activeOrgId || !validOrgIds.includes(activeOrgId)) activeOrgId = validOrgIds[0]

  const { data: folders } = await supabase
    .from('folders')
    .select('id, name, root_url, audits(created_at, status_code)')
    .eq('organization_id', activeOrgId)
    .order('name')

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
    <div className="p-8 w-full max-w-7xl mx-auto space-y-8 pb-32">
      
      {/* HEADER COMPACT */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <Activity className="h-6 w-6 text-blue-600" />
                Statuts Systèmes
            </h1>
            <p className="text-sm text-gray-500 mt-1">
                Disponibilité des services sur 60 jours.
            </p>
        </div>
      </div>

      {/* LISTE PLEINE LARGEUR (COMPACTE) */}
      <div className="space-y-3">
        {sitesStatus.length > 0 ? (
            sitesStatus.map((site) => (
                <Card key={site.id} className="shadow-sm border-gray-200 hover:border-blue-200 transition-colors">
                    <CardContent className="p-4 flex flex-col md:flex-row gap-4 md:items-center">
                        
                        {/* GAUCHE : INFO SITE (Largeur fixe sur Desktop pour alignement) */}
                        <div className="md:w-1/4 min-w-[200px] shrink-0">
                            <div className="flex items-center justify-between md:justify-start gap-2">
                                <Link href={`/site/${site.id}`} className="font-bold text-gray-900 hover:text-blue-600 truncate transition-colors text-base">
                                    {site.name}
                                </Link>
                                {/* Bouton mobile uniquement (pour gagner de la place) */}
                                <Button variant="ghost" size="icon" className="h-6 w-6 md:hidden text-gray-400" asChild>
                                    <Link href={`/site/${site.id}`}><ChevronRight className="h-4 w-4" /></Link>
                                </Button>
                            </div>
                            <a href={site.url} target="_blank" className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-1 mt-0.5 w-fit">
                                <Globe className="h-3 w-3" /> {site.url} <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                        </div>

                        {/* CENTRE : HISTORIQUE (Prend tout l'espace restant) */}
                        <div className="flex-1 min-w-0 border-l border-transparent md:border-gray-100 md:pl-6">
                            <UptimeHistory history={site.history} />
                        </div>

                        {/* DROITE : ACTION (Desktop uniquement) */}
                        <div className="hidden md:flex shrink-0 pl-4 border-l border-gray-100">
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-blue-600 hover:bg-blue-50" asChild>
                                <Link href={`/site/${site.id}`}>
                                    Détails <ChevronRight className="h-4 w-4 ml-1" />
                                </Link>
                            </Button>
                        </div>

                    </CardContent>
                </Card>
            ))
        ) : (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                Aucun site configuré.
            </div>
        )}
      </div>
    </div>
  )
}
