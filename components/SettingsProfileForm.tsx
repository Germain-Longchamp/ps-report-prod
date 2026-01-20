'use client'

import { updateProfile } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function SettingsProfileForm({ initialFirstName, initialLastName }: { initialFirstName: string, initialLastName: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    const result = await updateProfile(formData);
    setLoading(false);
    if (result?.success) setMessage("✅ Mis à jour");
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
      <form action={handleSubmit} className="flex flex-col items-start space-y-6 w-full max-w-lg">
        
        <div className="grid grid-cols-2 gap-6 w-full">
          <div className="space-y-2 text-left">
            <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">Prénom</Label>
            <Input id="firstName" name="firstName" defaultValue={initialFirstName} />
          </div>
          <div className="space-y-2 text-left">
            <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">Nom</Label>
            <Input id="lastName" name="lastName" defaultValue={initialLastName} />
          </div>
        </div>

        <div className="flex items-center gap-4">
            <Button type="submit" disabled={loading} className="bg-black text-white hover:bg-gray-800">
              {loading ? "Sauvegarde..." : "Mettre à jour mon profil"}
            </Button>
            {message && <span className="text-sm font-medium text-gray-600 animate-in fade-in slide-in-from-left-2">{message}</span>}
        </div>
      </form>
    </div>
  );
}