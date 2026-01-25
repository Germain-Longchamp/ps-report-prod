import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { cookies } from 'next/headers'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Récupérer TOUTES les organisations du membre
  // On fait une jointure pour avoir le nom de l'organisation
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(id, name)')
    .eq('user_id', user.id)

  // On formate les données proprement
  const userOrgs = memberships?.map((m: any) => ({
      id: m.organizations.id,
      name: m.organizations.name
  })) || []

  // Sécurité : Si l'user n'a aucune org, il ne devrait pas être là
  if (userOrgs.length === 0) {
      // Tu pourrais rediriger vers une page "Créer une org" ici
      // Pour l'instant on laisse couler ou on redirige vers logout
  }

  // 3. GESTION DU CONTEXTE (Active Org)
  const cookieStore = await cookies()
  const cookieOrgId = cookieStore.get('active_org_id')?.value
  
  // On vérifie que le cookie correspond bien à une org de l'utilisateur (Anti-triche)
  let activeOrgId = cookieOrgId ? parseInt(cookieOrgId) : null
  const isMemberOfActive = userOrgs.find(o => o.id === activeOrgId)

  // Si pas de cookie ou cookie invalide, on force la première org de la liste
  if (!activeOrgId || !isMemberOfActive) {
      activeOrgId = userOrgs[0]?.id
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 selection:bg-black selection:text-white">
      {/* On passe tout à la sidebar */}
      <Sidebar 
          userEmail={user.email!} 
          organizations={userOrgs} 
          activeOrgId={activeOrgId!} 
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}