'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Settings, LogOut, Folder, Plus, Loader2, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createFolder } from '@/app/actions'
import { toast } from "sonner"
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

interface DashboardSidebarProps {
  userEmail: string | undefined
  folders: any[] | null
}

export function DashboardSidebar({ userEmail, folders }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  
  // États pour la PopUp et le chargement
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const isActive = (path: string) => pathname === path
  const isSiteActive = (id: string) => pathname === `/site/${id}`

  // Gestion de la création de site
  const handleCreateSite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    // On garde le toast loading pour indiquer que ça travaille
    const toastId = toast.loading("Création du site en cours...")

    const res = await createFolder(formData)

    setIsLoading(false) // On arrête le loader du bouton immédiatement

    if (res.error) {
        toast.error("Erreur", { id: toastId, description: res.error })
    } else if (res.success && res.id) {
        // 1. On ferme la modale TOUT DE SUITE pour rendre la main à l'utilisateur
        setIsDialogOpen(false) 
        
        // 2. Feedback Succès
        toast.success("Site créé !", { id: toastId })
        
        // 3. Redirection fluide
        // Grâce au revalidatePath du serveur, pas besoin de router.refresh() lourd
        router.push(`/site/${res.id}`) 
    }
  }

  return (
    <aside className="w-64 bg-[#0A0A0A] text-white hidden md:flex flex-col fixed inset-y-0 z-50 border-r border-white/10">
        
        {/* LOGO PS REPORT */}
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <span className="font-bold text-xl tracking-tight text-white">PS Report</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-8">
          
          {/* Navigation Principale */}
          <div className="space-y-1">
            <Link 
              href="/" 
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive('/') 
                  ? "bg-white/10 text-white" 
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              Vue d'ensemble
            </Link>

            <Link 
              href="/settings" 
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive('/settings') 
                  ? "bg-white/10 text-white" 
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Settings className="h-4 w-4" />
              Paramètres
            </Link>
          </div>

          {/* Liste des Sites */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Mes Sites</h3>
              
              {/* --- BOUTON AJOUT (POPUP) --- */}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <button className="text-zinc-500 hover:text-white transition-colors p-1 rounded hover:bg-white/10">
                        <Plus className="h-4 w-4" />
                    </button>
                </DialogTrigger>
                <DialogContent className="bg-white text-black sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Nouveau Site</DialogTitle>
                        <DialogDescription>
                            Ajoutez un nouveau projet à monitorer.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleCreateSite} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nom du projet</Label>
                            <Input id="name" name="name" placeholder="Ex: Mon E-commerce" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="rootUrl">URL Racine</Label>
                            <div className="relative">
                                <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input id="rootUrl" name="rootUrl" placeholder="https://mon-site.com" className="pl-9" required />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isLoading} className="bg-black text-white hover:bg-gray-800">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Créer le site
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
              </Dialog>
              {/* ----------------------------- */}

            </div>
            
            <div className="space-y-1">
              {folders && folders.length > 0 ? (
                folders.map((folder) => (
                  <Link 
                    key={folder.id} 
                    href={`/site/${folder.id}`}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors group",
                        isSiteActive(folder.id)
                          ? "bg-white/10 text-white"
                          : "text-zinc-400 hover:bg-white/5 hover:text-white"
                      )}
                  >
                    <Folder className={cn("h-4 w-4 transition-colors", isSiteActive(folder.id) ? "text-white" : "text-zinc-500 group-hover:text-white")} />
                    <span className="truncate">{folder.name}</span>
                  </Link>
                ))
              ) : (
                <p className="px-3 text-xs text-zinc-600 italic">Aucun site configuré.</p>
              )}
            </div>
          </div>

        </nav>

        {/* Footer User */}
        <div className="p-4 border-t border-white/10 bg-[#0A0A0A]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white ring-1 ring-white/10">
               {userEmail?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-xs font-medium text-white truncate">{userEmail}</p>
               <form action="/auth/signout" method="post">
                 <button className="text-[10px] text-zinc-500 hover:text-red-400 flex items-center gap-1 mt-0.5 transition-colors">
                   <LogOut className="h-3 w-3" /> Déconnexion
                 </button>
               </form>
            </div>
          </div>
        </div>

    </aside>
  )
}