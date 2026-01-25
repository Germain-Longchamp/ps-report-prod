'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Globe, Loader2, Plus } from 'lucide-react'
import { toast } from "sonner"
import { createFolder } from '@/app/actions'

export function CreateSiteModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleCreateSite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const toastId = toast.loading("Création du site en cours...")
    
    const res = await createFolder(formData)
    
    setIsLoading(false)

    if (res.error) {
        toast.error("Erreur", { id: toastId, description: res.error })
    } else if (res.success && res.id) {
        setOpen(false) 
        toast.success("Site créé !", { id: toastId })
        router.refresh() // Rafraîchit les données du layout (Sidebar)
        router.push(`/site/${res.id}`) 
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-white text-gray-900 border-gray-200 shadow-2xl sm:max-w-[425px]">
        <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Globe className="h-5 w-5" />
                </div>
                <DialogTitle>Nouveau Site</DialogTitle>
            </div>
            <DialogDescription className="text-gray-500">
                Ajoutez un nouveau projet à monitorer dans l'organisation active.
            </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateSite} className="space-y-4 pt-2">
            <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700">Nom du projet</Label>
                <Input 
                    id="name" 
                    name="name" 
                    placeholder="Ex: Mon E-commerce" 
                    className="bg-gray-50 border-gray-200 focus:bg-white"
                    required 
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="rootUrl" className="text-gray-700">URL Racine</Label>
                <div className="relative">
                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input 
                        id="rootUrl" 
                        name="rootUrl" 
                        placeholder="https://mon-site.com" 
                        className="pl-9 bg-gray-50 border-gray-200 focus:bg-white" 
                        required 
                    />
                </div>
            </div>
            <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="text-gray-600">
                    Annuler
                </Button>
                <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Créer le site
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}