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
    formData.append('orgId', orgId);
    
    const result = await updateOrgSettings(formData);
    setLoading(false);

    if (result?.error) setMessage("❌ " + result.error);
    if (result?.success) setMessage("✅ Sauvegardé");
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
      <form action={handleSubmit} className="flex flex-col items-start space-y-6 w-full max-w-lg">
        
        <div className="w-full space-y-2 text-left">
          <Label htmlFor="apiKey" className="text-sm font-medium text-gray-700">
            Clé API Google PageSpeed
          </Label>
          <div className="relative">
            <Input 
              id="apiKey" 
              name="apiKey" 
              type="password" 
              defaultValue={initialApiKey} 
              placeholder="Ex: AIzaSy..." 
              className="font-mono text-sm"
            />
          </div>
          <p className="text-xs text-gray-500 text-left">
            Cette clé sera utilisée pour tous les audits des sites de <strong>{orgName}</strong>.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
            <Button type="submit" disabled={loading} className="bg-black text-white hover:bg-gray-800">
              {loading ? "Sauvegarde..." : "Enregistrer la clé"}
            </Button>
            {message && <span className="text-sm font-medium text-gray-600 animate-in fade-in slide-in-from-left-2">{message}</span>}
        </div>
      </form>
    </div>
  );
}