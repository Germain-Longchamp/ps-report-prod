// app/(dashboard)/page.tsx
import { CreateOrgForm } from "@/components/CreateOrgForm";
import { SiteCard } from "@/components/SiteCard";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membershipData } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(name)")
    .eq("user_id", user.id)
    .single();

  if (!membershipData) return <CreateOrgForm />;

  const orgName = membershipData.organizations?.name || "Organisation";
  let folders = null;

  if (membershipData.organization_id) {
    const { data } = await supabase
      .from("folders")
      .select("id, name, root_url, status")
      .eq("organization_id", membershipData.organization_id)
      .order('created_at', { ascending: false });
    folders = data;
  }

  // MODIFICATION ICI : On a retiré "flex-1 overflow-hidden" et le div interne "overflow-auto"
  // On laisse le contenu couler naturellement, c'est le layout.tsx qui le scrolera.
  return (
    <div className="flex flex-col min-h-full"> 
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <h1 className="text-xl font-semibold text-gray-800">Tableau de bord</h1>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">ORG</span>
          {orgName}
        </div>
      </header>

      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {!folders || folders.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg h-64 flex flex-col items-center justify-center text-gray-400 gap-4">
              <p>Bienvenue dans {orgName} !</p>
              <p>Commencez par créer votre premier site via le bouton dans la barre latérale.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {folders.map((folder) => (
                <SiteCard 
                  key={folder.id}
                  id={folder.id}
                  name={folder.name}
                  url={folder.root_url}
                  status={folder.status || 'unknown'}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}