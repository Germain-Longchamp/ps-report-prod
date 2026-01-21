'use client'

import { useState } from 'react'
import { runGlobalAudit } from '@/app/actions' // On appelle la nouvelle action
import { Button } from '@/components/ui/button'
import { RefreshCcw, Loader2, Zap } from 'lucide-react'

interface RunAuditButtonProps {
  folderId: string
}

export function RunAuditButton({ folderId }: RunAuditButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleGlobalAudit = async () => {
    if (isLoading) return
    setIsLoading(true)
    
    // Appel de l'action globale (Racine + Pages)
    const result = await runGlobalAudit(folderId)
    
    setIsLoading(false)

    if (result.error) {
      alert("Erreur: " + result.error)
    } else {
      // Un petit feedback sympa (si vous aviez un composant Toast ce serait mieux)
      console.log(result.success)
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
            <span className="font-medium">Analyse en cours...</span>
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