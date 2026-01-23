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

  // 2. Data
  const { data: folders } = await supabase
    .from('folders')
    .select('id, name')
    .order('created_at', { ascending: false })

  return (
    <div className="flex min-h-screen bg-gray-50/30">
      
      {/* On appelle le composant Client ici */}
      <DashboardSidebar userEmail={user.email} folders={folders} />

      {/* Main Content */}
      <main className="flex-1 md:ml-64 transition-all duration-300">
        {children}
      </main>

    </div>
  )
}