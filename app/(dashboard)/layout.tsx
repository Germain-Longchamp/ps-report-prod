// app/(dashboard)/layout.tsx
import { Sidebar } from "@/components/Sidebar";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  const { data: membershipData } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  let folders = [];
  if (membershipData?.organization_id) {
    const { data } = await supabase
      .from("folders")
      .select("id, name, root_url, status")
      .eq("organization_id", membershipData.organization_id)
      .order('created_at', { ascending: false });
    folders = data || [];
  }

  return (
    // 1. Le conteneur principal fait la taille de l'écran et ne scrolle pas (pour figer la sidebar)
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* 2. La Sidebar (gauche) */}
      <Sidebar folders={folders} />

      {/* 3. La Zone de Contenu (droite) */}
      {/* flex-1 : Prend toute la largeur restante */}
      {/* overflow-y-auto : C'est LUI qui crée la barre de défilement pour le contenu */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}