// app/(dashboard)/layout.tsx
import { Sidebar } from "@/components/Sidebar";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children, // C'est ici que viendront s'insérer vos pages (Dashboard ou Détail Site)
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. Vérification Auth (Identique à votre page actuelle)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  // 2. Récupérer l'ID de l'organisation pour la Sidebar
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* La Sidebar est chargée ICI, une seule fois pour tout le layout */}
      <Sidebar folders={folders} />

      {/* "children" sera remplacé par le contenu de page.tsx ou site/[id]/page.tsx */}
      {children}
    </div>
  );
}