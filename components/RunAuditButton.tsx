'use client'

import { useState } from 'react'
import { runGlobalAudit } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Loader2, Play } from 'lucide-react' // 1. On change l'import ici
import { toast } from "sonner"

interface RunAuditButtonProps {
  folderId: string
}

export function RunAuditButton({ folderId }: RunAuditButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleGlobalAudit = async () => {
    if (isLoading) return
    setIsLoading(true)
    
    const toastId = toast.loading("Analyse globale en cours...")

    try {
        const result = await runGlobalAudit(folderId)
        
        setIsLoading(false)

        if (result.error) {
          toast.error("Erreur lors de l'analyse", {
            id: toastId,
            description: result.error
          })
        } else {
          toast.success("Analyse terminée !", {
            id: toastId,
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
        className={`
            h-12 px-6 rounded-full shadow-2xl transition-all duration-300
            ${isLoading ? 'bg-gray-800 cursor-not-allowed' : 'bg-black hover:bg-gray-900 hover:scale-105 active:scale-95'}
            text-white flex items-center gap-2
        `}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-medium text-sm">Analyse...</span>
          </>
        ) : (
          <>
            {/* 2. On change l'icône et la couleur ici (Bleu) */}
            <Play className="h-4 w-4 fill-blue-400 text-blue-400" />
            <span className="font-semibold text-sm">Lancer l'audit</span>
          </>
        )}
      </Button>
    </div>
  )
}