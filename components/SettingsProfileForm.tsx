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
    if (result?.success) setMessage("✅ Profil mis à jour");
  }

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Profil Personnel</h2>
      <form action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Prénom</Label>
            <Input id="firstName" name="firstName" defaultValue={initialFirstName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Nom</Label>
            <Input id="lastName" name="lastName" defaultValue={initialLastName} />
          </div>
        </div>
        <div className="flex items-center justify-between">
            <Button type="submit" disabled={loading}>
            {loading ? "Sauvegarde..." : "Mettre à jour mon profil"}
            </Button>
            {message && <span className="text-sm font-medium">{message}</span>}
        </div>
      </form>
    </div>
  );
}