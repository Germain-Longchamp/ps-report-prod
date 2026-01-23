import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/DashboardSidebar'

// Force le rendu dynamique pour avoir les données à jour
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 1. Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Data pour la liste des dossiers
  const { data: folders } = await supabase
    .from('folders')
    .select('id, name')
    .order('created_at', { ascending: false })

  // 3. CALCUL DU NOMBRE D'INCIDENTS (Badge)
  // On récupère le strict minimum pour calculer vite
  const [foldersRes, pagesRes] = await Promise.all([
    supabase.from('folders').select('id, audits(status_code, created_at)'),
    supabase.from('pages').select('id, audits(status_code, created_at)')
  ])

  let incidentCount = 0

  // Check Sites
  const allFolders = foldersRes.data || []
  allFolders.forEach((f: any) => {
    if (f.audits?.length > 0) {
        const last = f.audits.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        if (last.status_code >= 400) incidentCount++
    }
  })

  // Check Pages
  const allPages = pagesRes.data || []
  allPages.forEach((p: any) => {
    if (p.audits?.length > 0) {
        const last = p.audits.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        if (last.status_code >= 400) incidentCount++
    }
  })

  return (
    <div className="flex min-h-screen bg-gray-50/30">
      
      {/* On passe le compteur en props */}
      <DashboardSidebar 
        userEmail={user.email} 
        folders={folders} 
        incidentCount={incidentCount} // <--- NOUVEAU
      />

      {/* Main Content */}
      <main className="flex-1 md:ml-64 transition-all duration-300">
        {children}
      </main>

    </div>
  )
}