// app/(dashboard)/settings/page.tsx
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { SettingsProfileForm } from "@/components/SettingsProfileForm";
import { SettingsOrgForm } from "@/components/SettingsOrgForm";

export default async function SettingsPage() {
  const supabase = await createClient();

  // 1. Récupérer l'utilisateur
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Récupérer le Profil
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // 3. Récupérer l'Organisation et ses settings
  // Note: On suppose toujours une seule org pour le MVP
  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(id, name, google_api_key)")
    .eq("user_id", user.id)
    .single();

  const organization = member?.organizations;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles et la configuration de votre équipe.
        </p>
      </div>

      <div className="grid gap-8">
        {/* Section Organisation (Clé API) */}
        {organization && (
          <SettingsOrgForm 
            orgId={organization.id} 
            orgName={organization.name}
            initialApiKey={organization.google_api_key || ""} 
          />
        )}

        {/* Section Profil */}
        <SettingsProfileForm 
          initialFirstName={profile?.first_name || ""} 
          initialLastName={profile?.last_name || ""} 
        />
      </div>
    </div>
  );
}