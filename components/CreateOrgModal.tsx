'use client'

import { useState } from 'react'
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const res = await createOrganization(formData)

    setIsLoading(false)

    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success("Organisation créée avec succès !")
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg">
                <Building2 className="h-5 w-5" />
            </div>
          </div>
          <DialogTitle>Nouvelle Organisation</DialogTitle>
          <DialogDescription>
            Créez un nouvel espace de travail pour isoler vos projets et vos équipes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Nom de l'organisation</Label>
            <Input 
                id="orgName" 
                name="orgName" 
                placeholder="Ex: Agence Web Lambda" 
                required 
                className="col-span-3"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                Créer l'espace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}