'use client'

import { useState } from 'react'
import { Settings, Trash2, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { updateFolder, deleteFolder } from '@/app/actions'

interface SiteHeaderActionsProps {
  folder: {
    id: string
    name: string
    root_url: string
  }
}

export function SiteHeaderActions({ folder }: SiteHeaderActionsProps) {
  const [isUpdateOpen, setIsUpdateOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Gestion de la Mise à Jour
  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsUpdating(true)
    
    const formData = new FormData(e.currentTarget)
    await updateFolder(formData)
    
    setIsUpdating(false)
    setIsUpdateOpen(false)
  }

  // Gestion de la Suppression
  const handleDelete = async () => {
    setIsDeleting(true)
    await deleteFolder(folder.id)
    // Pas besoin de remettre à false car on est redirigé
  }

  return (
    <div className="flex items-center gap-2">
      
      {/* --- 1. BOUTON PARAMÈTRES (DIALOG) --- */}
      <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
            <Settings className="h-4 w-4 mr-2" />
            Paramètres
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>Paramètres du site</DialogTitle>
            <DialogDescription>
              Modifiez le nom ou l'URL racine de ce dossier.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdate} className="grid gap-4 py-4">
            <input type="hidden" name="folderId" value={folder.id} />
            
            <div className="grid gap-2">
              <Label htmlFor="name">Nom du dossier</Label>
              <Input 
                id="name" 
                name="name" 
                defaultValue={folder.name} 
                className="col-span-3" 
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="rootUrl">URL Racine</Label>
              <Input 
                id="rootUrl" 
                name="rootUrl" 
                defaultValue={folder.root_url} 
                className="col-span-3" 
                required
              />
            </div>

            <DialogFooter>
               <Button type="submit" disabled={isUpdating} className="bg-black text-white hover:bg-gray-800">
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Enregistrer
               </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- 2. BOUTON SUPPRIMER (ALERT DIALOG) --- */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600 hover:bg-red-50">
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin text-red-600" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Cela supprimera définitivement le dossier 
              <span className="font-bold text-black mx-1">{folder.name}</span>
              ainsi que tout l'historique des audits et les pages associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
                onClick={handleDelete}
                className="bg-red-600 text-white hover:bg-red-700"
            >
              Confirmer la suppression
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}