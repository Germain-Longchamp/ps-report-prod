import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { SettingsProfileForm } from "@/components/SettingsProfileForm";
import { SettingsOrgForm } from "@/components/SettingsOrgForm";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(id, name, google_api_key)")
    .eq("user_id", user.id)
    .single();

  const organization = member?.organizations;

  return (
    // CORRECTION : Retrait de 'mx-auto' pour aligner le bloc à gauche.
    // Ajout de 'w-full' pour s'assurer qu'il prend l'espace disponible.
    <div className="p-10 w-full max-w-6xl space-y-10">
      
      {/* En-tête */}
      <div className="flex flex-col items-start space-y-2 border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Paramètres</h1>
        <p className="text-lg text-gray-500">
          Gérez vos informations personnelles et la configuration de votre équipe.
        </p>
      </div>

      <div className="grid gap-10">
        {/* Section Organisation */}
        {organization && (
          <section className="grid gap-4 items-start lg:grid-cols-[280px_1fr]">
            <div className="text-left">
              <h2 className="text-lg font-semibold text-gray-900">Organisation</h2>
              <p className="text-sm text-gray-500 mt-1">
                Configuration globale pour {organization.name}.
              </p>
            </div>
            <SettingsOrgForm 
              orgId={organization.id} 
              orgName={organization.name}
              initialApiKey={organization.google_api_key || ""} 
            />
          </section>
        )}

        {/* Séparateur */}
        <div className="border-t border-gray-100" />

        {/* Section Profil */}
        <section className="grid gap-4 items-start lg:grid-cols-[280px_1fr]">
            <div className="text-left">
              <h2 className="text-lg font-semibold text-gray-900">Profil Personnel</h2>
              <p className="text-sm text-gray-500 mt-1">
                Vos informations d'identification sur la plateforme.
              </p>
            </div>
            <SettingsProfileForm 
              initialFirstName={profile?.first_name || ""} 
              initialLastName={profile?.last_name || ""} 
            />
        </section>
      </div>
    </div>
  );
}