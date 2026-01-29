'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateOrgName } from "@/app/actions"
import { Save, Loader2, Building2 } from "lucide-react"
import { toast } from "sonner"

export function EditOrgNameForm({ orgId, initialName }: { orgId: string, initialName: string }) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const res = await updateOrgName(formData)
    setLoading(false)

    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success(res.success)
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col md:flex-row gap-4 md:items-end">
        <input type="hidden" name="orgId" value={orgId} />
        <div className="flex-1 w-full space-y-2">
            <Label htmlFor="orgName" className="text-gray-700 font-medium">Nom de l'organisation</Label>
            <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input 
                    id="orgName" 
                    name="orgName" 
                    defaultValue={initialName} 
                    className="pl-9 bg-white border-gray-200 focus:border-black focus:ring-black/5 transition-all" 
                    placeholder="Ma super entreprise"
                />
            </div>
        </div>
        <Button type="submit" disabled={loading} className="bg-black text-white hover:bg-zinc-800 mb-0.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Renommer
        </Button>
    </form>
  )
}
