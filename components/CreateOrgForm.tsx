import { createOrganization } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";

export function CreateOrgForm() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-gray-100 text-center">
        
        <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
          <Building2 className="text-blue-600 h-8 w-8" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Bienvenue !</h1>
        <p className="text-gray-500 mb-8">
          Pour commencer, créez votre espace de travail (Organisation).
        </p>

        {/* Le formulaire appelle directement l'action serveur */}
        <form action={createOrganization} className="space-y-6 text-left">
          <div className="space-y-2">
            <Label htmlFor="orgName">Nom de l'organisation</Label>
            <Input 
              id="orgName" 
              name="orgName" 
              placeholder="Ex: Mon Agence Web" 
              required 
            />
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
            Créer mon espace
          </Button>
        </form>
      </div>
    </div>
  );
}