'use client'

import { useState } from 'react'
import { runPageSpeedAudit } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { RefreshCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner' // Si vous avez sonner/toast, sinon simple alert

export function RunAuditButton({ url, folderId }: { url: string, folderId: string }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleAudit = async () => {
    setIsLoading(true)
    
    // Appel de la Server Action
    const result = await runPageSpeedAudit(url, folderId)
    
    setIsLoading(false)

    if (result.error) {
      alert("Erreur: " + result.error) // Ou toast.error(result.error)
    } else {
      // Pas besoin de recharger la page, revalidatePath l'a fait côté serveur !
      alert("Audit terminé !") // Ou toast.success("Audit terminé !")
    }
  }

  return (
    <Button onClick={handleAudit} disabled={isLoading}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Analyse en cours...
        </>
      ) : (
        <>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Lancer une analyse
        </>
      )}
    </Button>
  )
}