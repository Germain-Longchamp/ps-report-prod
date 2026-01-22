'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus } from 'lucide-react'
import { createPage } from '@/app/actions'
import { toast } from "sonner"

export function AddPageForm({ folderId }: { folderId: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    
    // On peut mettre un toast loading si on veut, ou juste attendre le succès
    // Ici l'audit se lance à la création, donc ça peut prendre 5s
    const toastId = toast.loading("Création et analyse de la page...")

    const result = await createPage(formData)
    
    setIsLoading(false)

    if (result.error) {
      toast.error("Erreur", { id: toastId, description: result.error })
    } else {
      toast.success("Page ajoutée !", { 
        id: toastId, 
        description: "L'audit initial a été réalisé avec succès." 
      })
      // On vide le formulaire pour pouvoir en ajouter une autre
      formRef.current?.reset()
    }
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="p-1 bg-black text-white rounded">
                <Plus className="h-3 w-3" />
            </div>
            Suivre une nouvelle URL
        </h3>
        
        {/* On utilise l'attribut 'action' avec une fonction wrapper pour intercepter la fin */}
        <form 
            ref={formRef}
            action={handleSubmit} 
            className="flex flex-col md:flex-row gap-3 items-end"
        >
            <input type="hidden" name="folderId" value={folderId} />
            
            <div className="w-full md:w-1/3 space-y-1.5">
                <label htmlFor="name" className="text-xs font-semibold text-gray-500 ml-1">Nom (ex: Tarifs)</label>
                <Input id="name" name="name" placeholder="Nom de la page..." className="bg-gray-50 border-gray-200 focus:bg-white transition-all" />
            </div>
            
            <div className="w-full md:flex-1 space-y-1.5">
                <label htmlFor="url" className="text-xs font-semibold text-gray-500 ml-1">URL Complète</label>
                <Input id="url" name="url" placeholder="https://..." required className="bg-gray-50 border-gray-200 focus:bg-white transition-all" />
            </div>
            
            <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-black text-white hover:bg-gray-800 shadow-sm min-w-[100px]"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ...
                    </>
                ) : (
                    "Ajouter"
                )}
            </Button>
        </form>
    </div>
  )
}