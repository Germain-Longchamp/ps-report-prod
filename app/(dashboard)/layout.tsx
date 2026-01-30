import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, Key } from 'lucide-react' // Nouveaux imports

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. RECUPERER LES ORGANISATIONS
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(id, name)')
    .eq('user_id', user.id)

  const userOrgs = memberships?.map((m: any) => ({
      id: m.organizations.id,
      name: m.organizations.name
  })) || []

  // 3. RECUPERER L'ORG ACTIVE
  const cookieStore = await cookies()
  let activeOrgId = Number(cookieStore.get('active_org_id')?.value)
  const isMemberOfActive = userOrgs.find(o => o.id === activeOrgId)

  if (!activeOrgId || !isMemberOfActive) {
      activeOrgId = userOrgs[0]?.id
  }

  // 4. CHECK API KEY (NOUVEAU)
  // On vérifie spécifiquement si la clé API est présente pour l'organisation active
  let isMissingApiKey = false
  if (activeOrgId) {
      const { data: currentOrg } = await supabase
        .from('organizations')
        .select('google_api_key')
        .eq('id', activeOrgId)
        .single()
      
      // Si pas de data ou clé vide/null
      if (!currentOrg || !currentOrg.google_api_key) {
          isMissingApiKey = true
      }
  }

  // 5. RECUPERER LES DONNÉES DE SIDEBAR
  const [foldersRes] = await Promise.all([
      supabase.from('folders')
        .select('id, name')
        .eq('organization_id', activeOrgId)
        .order('name')
  ])
  
  // Note: On passe 0 pour les incidents pour l'instant (optimisation)
  const incidentCount = 0 

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 selection:bg-black selection:text-white">
      
      <DashboardSidebar 
          userEmail={user.email!} 
          folders={foldersRes.data || []}
          incidentCount={incidentCount}
          organizations={userOrgs}
          activeOrgId={activeOrgId!}
      />
      
      <main className="flex-1 md:ml-64 overflow-y-auto flex flex-col">
        
        {/* BANDEAU D'ALERTE API KEY (NOUVEAU) */}
        {isMissingApiKey && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 text-amber-700 rounded-full shrink-0">
                        <Key className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-amber-900">
                            Configuration requise
                        </p>
                        <p className="text-sm text-amber-700 mt-0.5">
                            Vous devez ajouter une clé API Google pour lancer les audits de performance.
                        </p>
                    </div>
                </div>
                <Link href="/settings">
                    <button className="whitespace-nowrap flex items-center gap-2 text-xs font-semibold bg-amber-100 text-amber-800 px-4 py-2 rounded-lg hover:bg-amber-200 transition-colors border border-amber-200 shadow-sm">
                        Configurer maintenant
                        <ArrowRight className="h-3 w-3" />
                    </button>
                </Link>
            </div>
        )}

        {children}
      </main>
    </div>
  )
}
