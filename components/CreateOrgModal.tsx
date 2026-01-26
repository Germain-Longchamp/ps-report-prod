'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation' // Ajout du router
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, PlusCircle, Loader2 } from 'lucide-react'
import { toast } from "sonner"
import { createOrganization } from '@/app/actions'

export function CreateOrgModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter() // Hook pour rafraîchir

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    
    // On appelle l'action
    const res = await createOrganization(formData)

    // On arrête le chargement QUOI QU'IL ARRIVE
    setIsLoading(false)

    if (res?.error) {
      toast.error(res.error)
    } else {
      // Succès !
      setOpen(false) // 1. On ferme la modale
      toast.success("Organisation créée avec succès !") // 2. Petit toast
      router.refresh() // 3. On rafraîchit les données pour voir la nouvelle org
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white border-zinc-200 text-zinc-950">
        <DialogHeader>
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg">
                <Building2 className="h-5 w-5" />
            </div>
          </div>
          <DialogTitle>Nouvelle Organisation</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Créez un nouvel espace de travail pour isoler vos projets et vos équipes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="orgName" className="text-zinc-700">Nom de l'organisation</Label>
            <Input 
                id="orgName" 
                name="orgName" 
                placeholder="Ex: Agence Web Lambda" 
                required 
                className="col-span-3 border-zinc-200 focus-visible:ring-indigo-500"
            />
          </div>

          <DialogFooter>
            <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            >
                Annuler
            </Button>
            <Button 
                type="submit" 
                disabled={isLoading} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                Créer l'espace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}