'use client'

import { useState } from 'react'
import { runGlobalAudit } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Loader2, Zap } from 'lucide-react'
import { toast } from "sonner"

interface RunAuditButtonProps {
  folderId: string
}

export function RunAuditButton({ folderId }: RunAuditButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleGlobalAudit = async () => {
    if (isLoading) return
    setIsLoading(true)
    
    // 1. DÉCLARATION DU TOAST ID (C'est cette ligne qui manquait ou était mal placée)
    // On stocke l'ID du toast pour pouvoir le mettre à jour ensuite (succès ou erreur)
    const toastId = toast.loading("Analyse globale en cours...")

    try {
        // 2. Lancement de l'action serveur
        const result = await runGlobalAudit(folderId)
        
        setIsLoading(false)

        if (result.error) {
          // Cas d'erreur : on met à jour le toast existant
          toast.error("Erreur lors de l'analyse", {
            id: toastId,
            description: result.error
          })
        } else {
          // Cas de succès : on met à jour le toast existant
          toast.success("Analyse terminée !", {
            id: toastId, // Ici la variable est maintenant bien définie
            description: result.success
          })
        }
    } catch (err) {
        setIsLoading(false)
        toast.error("Erreur technique", {
            id: toastId,
            description: "Une erreur imprévue est survenue."
        })
    }
  }

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <Button 
        onClick={handleGlobalAudit} 
        disabled={isLoading}
        size="lg"
        className={`
            h-14 px-6 rounded-full shadow-xl transition-all duration-300
            ${isLoading ? 'bg-gray-800 cursor-not-allowed' : 'bg-black hover:bg-gray-900 hover:scale-105'}
            text-white border border-gray-700/50
        `}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span className="font-medium">Analyse...</span>
          </>
        ) : (
          <>
            <Zap className="mr-2 h-5 w-5 fill-yellow-400 text-yellow-400" />
            <span className="font-bold text-lg">Lancer une analyse complète</span>
          </>
        )}
      </Button>
    </div>
  )
}