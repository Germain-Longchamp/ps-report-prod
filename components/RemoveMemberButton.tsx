'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { removeMember } from '@/app/actions'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from "sonner"

export function RemoveMemberButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleRemove = async () => {
    setIsLoading(true)
    
    // On prépare les données pour l'action serveur
    const formData = new FormData()
    formData.append('userId', userId)

    // Appel de l'action serveur
    const res = await removeMember(formData)
    
    setIsLoading(false)

    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success("Membre retiré de l'équipe.")
      setOpen(false)     // Ferme la modale
      router.refresh()   // Rafraîchit les données de la page (la liste disparaît)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Supprimer</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-white sm:max-w-[425px] border-red-100">
        <DialogHeader>
          <div className="flex items-center gap-3 text-red-600 mb-2">
            <div className="p-2.5 bg-red-50 rounded-full shrink-0">
                <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle>Retirer ce membre ?</DialogTitle>
          </div>
          <DialogDescription className="text-gray-500 pt-1">
            Cette action est irréversible. L'utilisateur perdra immédiatement l'accès à l'organisation et ne pourra plus consulter les sites.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)} 
            disabled={isLoading}
            className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
          >
            Annuler
          </Button>
          <Button 
            onClick={handleRemove} 
            disabled={isLoading} 
            className="bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-sm"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Confirmer le retrait
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}