'use client'

import { useState } from 'react'
import { deleteOrganization } from '@/app/actions'
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

export function DeleteOrgButton({ orgId, orgName }: { orgId: number, orgName: string }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    setIsLoading(true)
    const formData = new FormData()
    formData.append('orgId', orgId.toString())

    const res = await deleteOrganization(formData)
    
    // Note : Si succès, le redirect server-side prend le relais.
    // S'il y a une erreur qui revient :
    if (res?.error) {
        setIsLoading(false)
        toast.error(res.error)
        setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
            variant="destructive" 
            className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
        >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer l'organisation
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-white border-red-100 sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-3 text-red-600 mb-2">
            <div className="p-3 bg-red-50 rounded-full shrink-0">
                <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl">Supprimer définitivement ?</DialogTitle>
          </div>
          
          {/* On garde DialogDescription simple pour éviter l'erreur de hydration */}
          <DialogDescription className="text-gray-500">
            Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>

        {/* On met le contenu complexe ICI, en dehors du Header/Description */}
        <div className="py-2 text-sm text-gray-600">
            Vous êtes sur le point de supprimer <strong>{orgName}</strong>.<br/><br/>
            Cette action entraînera la suppression immédiate de :
            <ul className="list-disc list-inside mt-2 space-y-1 text-red-600/80 font-medium bg-red-50 p-3 rounded-md border border-red-100">
                <li>Tous les sites surveillés</li>
                <li>Tous les historiques d'audits</li>
                <li>Tous les accès des membres de l'équipe</li>
            </ul>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)} 
            disabled={isLoading}
            className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
          >
            Annuler
          </Button>
          <Button 
            onClick={handleDelete} 
            disabled={isLoading} 
            className="bg-red-600 hover:bg-red-700 text-white border-red-600"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Je confirme la suppression
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}