import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/DashboardSidebar' // Attention au nom du composant
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

  // 4. RECUPERER LES DONNÉES DE SIDEBAR (Folders & Incidents)
  // Note: On le fait ici pour que la Sidebar soit toujours à jour, peu importe la page
  const [foldersRes, incidentsRes] = await Promise.all([
      // A. Les dossiers de l'org active
      supabase.from('folders')
        .select('id, name')
        .eq('organization_id', activeOrgId)
        .order('name'),
      
      // B. Calcul des incidents (rapide)
      supabase.from('audits')
        .select('status_code, folder_id, folders!inner(organization_id)')
        .eq('folders.organization_id', activeOrgId)
        .gte('status_code', 400) // On ne compte que les erreurs
        // Note: C'est une approx rapide, pour un compte exact il faudrait dédoublonner par dernière date
        // Mais pour un badge sidebar, ça suffit souvent ou on affinera.
  ])
  
  // Pour un badge précis, on peut juste compter les folders en statut 'issues' si tu as ce champ
  // Ou on passe juste 0 pour l'instant si c'est trop lourd à calculer dans le layout
  const incidentCount = 0 

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 selection:bg-black selection:text-white">
      
      <DashboardSidebar 
          userEmail={user.email!} 
          folders={foldersRes.data || []} // Liste des sites
          incidentCount={incidentCount}
          organizations={userOrgs}      // Liste des orgs
          activeOrgId={activeOrgId!}    // ID Actif
      />
      
      <main className="flex-1 md:ml-64 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}