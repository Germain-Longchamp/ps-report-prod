'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Settings, 
  Trash2, 
  Loader2, 
  Save,
  AlertTriangle 
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from "sonner"
import { updateFolder, deleteFolder } from '@/app/actions'

export function SiteSettingsDialog({ folder }: { folder: any }) {
  const router = useRouter()
  
  // État pour la modale principale (Paramètres)
  const [isOpen, setIsOpen] = useState(false)
  
  // État pour la modale de confirmation (Suppression)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const [name, setName] = useState(folder.name)
  const [url, setUrl] = useState(folder.root_url)

  // 1. Mise à jour du dossier (UPDATE)
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
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

  // 2. Suppression du dossier (DELETE) - Déclenché par l'AlertDialog
  const confirmDelete = async () => {
    setIsDeleting(true)
    const res = await deleteFolder(folder.id)
    
    if (res?.error) {
        toast.error(res.error)
        setIsDeleting(false)
        setShowDeleteAlert(false) // On ferme l'alerte en cas d'erreur
    } else {
        toast.success("Site supprimé définitivement")
        // On force la fermeture et la redirection
        setShowDeleteAlert(false)
        setIsOpen(false)
        router.push('/') 
    }
  }

  return (
    <>
      {/* --- 1. MODALE PRINCIPALE (PARAMÈTRES) --- */}
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
              {/* Ce bouton ouvre l'alerte de confirmation au lieu de supprimer direct */}
              <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={() => setShowDeleteAlert(true)}
                  className="bg-red-50 text-red-600 hover:bg-red-100 border-0"
              >
                  <Trash2 className="h-4 w-4 mr-2" />
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

      {/* --- 2. MODALE DE CONFIRMATION (ALERT DIALOG) --- */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="bg-white">
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Êtes-vous absolument sûr ?
                </AlertDialogTitle>
                {/* AJOUT DE 'asChild' ICI */}
                <AlertDialogDescription asChild>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p>Cette action est <strong>irréversible</strong>.</p> 
                        <p>
                            Cela supprimera définitivement le site <strong>{folder.name}</strong> ainsi que :
                        </p>
                        <ul className="list-disc list-inside text-xs text-gray-500 ml-2">
                            <li>Toutes les pages suivies</li>
                            <li>L'historique complet des audits Lighthouse</li>
                            <li>Les scores de performance enregistrés</li>
                        </ul>
                    </div>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={(e) => {
                        e.preventDefault() // On empêche la fermeture auto pour gérer le loading
                        confirmDelete()
                    }} 
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 text-white border-0"
                >
                    {isDeleting ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Suppression...
                        </>
                    ) : (
                        "Supprimer définitivement"
                    )}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}