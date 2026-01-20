'use client'

import { updateOrgSettings } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function SettingsOrgForm({ orgId, orgName, initialApiKey }: { orgId: string, orgName: string, initialApiKey: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage("");
    
    // On ajoute l'ID caché
    formData.append('orgId', orgId);
    
    const result = await updateOrgSettings(formData);
    setLoading(false);

    if (result?.error) setMessage("❌ " + result.error);
    if (result?.success) setMessage("✅ " + result.success);
  }

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Général ({orgName})</h2>
      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apiKey">Clé API Google PageSpeed</Label>
          <Input 
            id="apiKey" 
            name="apiKey" 
            type="password" // Pour masquer la clé visuellement
            defaultValue={initialApiKey} 
            placeholder="AIzaSy..." 
          />
          <p className="text-xs text-muted-foreground">
            Requise pour lancer les audits de performance.
          </p>
        </div>
        
        <div className="flex items-center justify-between">
            <Button type="submit" disabled={loading}>
            {loading ? "Sauvegarde..." : "Enregistrer"}
            </Button>
            {message && <span className="text-sm font-medium">{message}</span>}
        </div>
      </form>
    </div>
  );
}