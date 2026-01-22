'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button 
        type="submit" 
        disabled={pending} 
        className="bg-black text-white hover:bg-gray-800 shadow-sm min-w-[100px]"
    >
      {pending ? (
        <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyse...
        </>
      ) : (
        "Ajouter"
      )}
    </Button>
  )
}