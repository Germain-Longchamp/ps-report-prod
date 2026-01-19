// app/(dashboard)/layout.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar' // Assurez-vous que le chemin est bon

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 1. Vérification Auth (Sécurité globale pour tout le dashboard)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Récupérer l'organisation de l'utilisateur
  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  let sites = []
  
  // 3. Si l'utilisateur a une org, on charge ses sites pour la Sidebar
  if (member) {
    const { data: folders } = await supabase
      .from('folders')
      .select('*')
      .eq('organization_id', member.organization_id)
      .order('created_at', { ascending: false })
    
    sites = folders || []
  }

  // 4. Le Layout : Sidebar Fixe à Gauche + Contenu Scrollable à Droite
  return (
    <div className="flex h-screen w-full bg-muted/40">
      {/* Sidebar - Fixe à gauche */}
      <aside className="hidden w-64 flex-col border-r bg-background md:flex">
         {/* On passe les sites récupérés au composant Sidebar */}
         <Sidebar sites={sites} />
      </aside>

      {/* Zone de Contenu Principal - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}