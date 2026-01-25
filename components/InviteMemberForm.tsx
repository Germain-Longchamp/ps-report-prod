'use client'

import { useState } from 'react'
import { inviteMember } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Plus, Loader2 } from 'lucide-react'
import { toast } from "sonner"

export function InviteMemberForm() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // 1. IMPORTANT : On sauvegarde le formulaire dans une variable MAINTENANT
    const form = e.currentTarget 
    
    setIsLoading(true)

    const formData = new FormData(form)
    const res = await inviteMember(formData) // <-- Le code attend ici

    setIsLoading(false)

    // Quand le code reprend ici, 'e.currentTarget' est perdu, 
    // mais notre variable 'form' existe toujours !

    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success(res?.success || "Membre ajouté !")
      // 2. On reset la variable sauvegardée
      form.reset()
    }
  }

  return (
    <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Ajouter un membre</label>
        <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input 
                    name="email" 
                    type="email" 
                    placeholder="collègue@exemple.com" 
                    required
                    className="pl-9 bg-white"
                />
            </div>
            <Button type="submit" disabled={isLoading} className="bg-black text-white hover:bg-zinc-800">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-2" /> Ajouter</>}
            </Button>
        </form>
        <p className="text-[11px] text-gray-400 mt-2">
            L'utilisateur doit déjà avoir créé un compte sur la plateforme.
        </p>
    </div>
  )
}