import { Sidebar } from "@/components/Sidebar";
import { CreateOrgForm } from "@/components/CreateOrgForm";
import { SiteCard } from "@/components/SiteCard"; // <-- Import du composant carte
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const supabase = await createClient();

  // 1. Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  // 2. Org check
  const { data: membershipData } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(name)")
    .eq("user_id", user.id)
    .single();

  if (!membershipData) {
    return <CreateOrgForm />;
  }

  const orgName = membershipData.organizations?.name || "Organisation Inconnue";
  const orgId = membershipData.organization_id;

  // 3. Récupérer les dossiers (AVEC URL et STATUS cette fois)
  let folders = null;
  if (orgId) {
    const { data } = await supabase
      .from("folders")
      .select("id, name, root_url, status") // <-- On ajoute root_url et status
      .eq("organization_id", orgId)
      .order('created_at', { ascending: false }); // Les plus récents en premier
    folders = data;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar folders={folders} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <h1 className="text-xl font-semibold text-gray-800">Tableau de bord</h1>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">ORG</span>
            {orgName}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto">
            
            {/* Condition d'affichage */}
            {!folders || folders.length === 0 ? (
              // CAS 1 : Pas de site -> On affiche le message de bienvenue
              <div className="border-2 border-dashed border-gray-300 rounded-lg h-64 flex flex-col items-center justify-center text-gray-400 gap-4">
                <p>Bienvenue dans {orgName} !</p>
                <p>Commencez par créer votre premier site via le bouton dans la barre latérale.</p>
              </div>
            ) : (
              // CAS 2 : Il y a des sites -> On affiche la grille de cartes
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
      </main>
    </div>
  );
}