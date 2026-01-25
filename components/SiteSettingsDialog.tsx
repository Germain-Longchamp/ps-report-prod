'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Settings, 
  Trash2, 
  Loader2, 
  Save 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from "sonner"
import { updateFolder, deleteFolder } from '@/app/actions' // Assurez-vous d'avoir ces actions

export function SiteSettingsDialog({ folder }: { folder: any }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState(folder.name)
  const [url, setUrl] = useState(folder.root_url)

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Appel Server Action (à vérifier dans app/actions.ts)
    const formData = new FormData()
    formData.append('id', folder.id)
    formData.append('name', name)
    formData.append('root_url', url)

    const res = await updateFolder(formData)
    
    setIsLoading(false)
    if (res?.error) {
        toast.error(res.error)
    } else {
        toast.success("Site mis à jour avec succès")
        setIsOpen(false)
        router.refresh()
    }
  }

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce site et tout son historique ?")) return
    
    setIsLoading(true)
    const res = await deleteFolder(folder.id)
    
    if (res?.error) {
        toast.error(res.error)
        setIsLoading(false)
    } else {
        toast.success("Site supprimé")
        router.push('/') // Redirection vers le dashboard
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
            <Settings className="h-4 w-4 mr-2" />
            Paramètres
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Paramètres du site</DialogTitle>
          <DialogDescription>
            Modifiez les informations générales ou supprimez ce site.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleUpdate} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nom du site</Label>
            <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="bg-gray-50"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url">URL Racine</Label>
            <Input 
                id="url" 
                value={url} 
                onChange={(e) => setUrl(e.target.value)} 
                className="bg-gray-50"
            />
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full mt-4">
            <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isLoading}
                className="bg-red-50 text-red-600 hover:bg-red-100 border-0"
            >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Supprimer
            </Button>

            <Button type="submit" disabled={isLoading} className="bg-black text-white hover:bg-zinc-800">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}