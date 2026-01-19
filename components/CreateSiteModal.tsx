'use client'

import { useState } from "react"
import { createFolder } from "@/app/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { useFormStatus } from "react-dom"

// Petit composant pour désactiver le bouton pendant le chargement
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full" disabled={pending}>
      {pending ? 'Création...' : 'Créer le site'}
    </Button>
  )
}

export function CreateSiteModal() {
  const [open, setOpen] = useState(false)

  async function clientAction(formData: FormData) {
    await createFolder(formData)
    setOpen(false) // Ferme la modale après succès
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="sm">
          <Plus className="h-4 w-4 mr-2" /> Nouveau Site
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nouveau Site Internet</DialogTitle>
          <DialogDescription>
            Ajoutez un nouveau site à surveiller dans votre tableau de bord.
          </DialogDescription>
        </DialogHeader>
        
        <form action={clientAction} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nom du site (Client/Projet)</Label>
            <Input id="name" name="name" placeholder="Ex: Site Vitrine Client A" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url">URL Racine</Label>
            <Input id="url" name="url" placeholder="https://www.exemple.com" required />
          </div>
          <div className="mt-4">
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}