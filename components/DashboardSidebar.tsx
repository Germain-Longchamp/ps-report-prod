'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Folder, 
  Plus, 
  Loader2, 
  Globe, 
  AlertOctagon, 
  ShieldCheck,
  Building2 // Icone pour la modale
} from 'lucide-react'
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
import { OrgSwitcher } from './OrgSwitcher' // <--- IMPORT DU SWITCHER

interface DashboardSidebarProps {
  userEmail: string | undefined
  folders: any[] | null
  incidentCount: number
  // NOUVELLES PROPS POUR LE MULTI-ORG
  organizations: any[] 
  activeOrgId: number
}

export function DashboardSidebar({ 
  userEmail, 
  folders, 
  incidentCount, 
  organizations, 
  activeOrgId 
}: DashboardSidebarProps) {
  
  const pathname = usePathname()
  const router = useRouter()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const isActive = (path: string) => pathname === path
  const isSiteActive = (id: string) => pathname === `/site/${id}`

  const handleCreateSite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const toastId = toast.loading("Création du site en cours...")
    
    // Le server action utilise maintenant le cookie active_org_id automatiquement
    const res = await createFolder(formData)
    
    setIsLoading(false)

    if (res.error) {
        toast.error("Erreur", { id: toastId, description: res.error })
    } else if (res.success && res.id) {
        setIsDialogOpen(false) 
        toast.success("Site créé !", { id: toastId })
        router.refresh() // <--- IMPORTANT : Rafraîchit la liste des dossiers
        router.push(`/site/${res.id}`) 
    }
  }

  return (
    <aside className="w-64 bg-[#0A0A0A] text-white hidden md:flex flex-col fixed inset-y-0 z-50 border-r border-white/10">
        
        {/* 1. HEADER : LOGO PS REPORT */}
        <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg shadow-sm shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300">
               <LayoutDashboard className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
              PS Report
            </span>
          </Link>
        </div>

        {/* 2. NAVIGATION & SITES (SCROLLABLE) */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar">
          
          {/* Menu Principal */}
          <div className="space-y-1">
            <Link 
              href="/" 
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive('/') ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              Vue d'ensemble
            </Link>

            <Link 
              href="/alerts" 
              className={cn(
                "flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors group",
                isActive('/alerts') ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                  <AlertOctagon className="h-4 w-4" />
                  Incidents
              </div>
              {incidentCount > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold shadow-sm group-hover:bg-red-500 transition-colors">
                      {incidentCount}
                  </span>
              )}
            </Link>

            <Link 
              href="/ssl" 
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive('/ssl') ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              Certificats SSL
            </Link>
          </div>

          {/* LISTE DES SITES (Folders) */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Vos Sites</h3>
              
              {/* MODALE D'AJOUT DE SITE */}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <button className="text-zinc-500 hover:text-white transition-colors p-1 rounded hover:bg-white/10">
                        <Plus className="h-4 w-4" />
                    </button>
                </DialogTrigger>
                <DialogContent className="bg-white text-gray-900 border-gray-200 shadow-2xl sm:max-w-[425px]">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Globe className="h-5 w-5" />
                            </div>
                            <DialogTitle>Nouveau Site</DialogTitle>
                        </div>
                        <DialogDescription className="text-gray-500">
                            Ajoutez un nouveau projet à monitorer dans l'organisation active.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSite} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-gray-700">Nom du projet</Label>
                            <Input 
                                id="name" 
                                name="name" 
                                placeholder="Ex: Mon E-commerce" 
                                className="bg-gray-50 border-gray-200 focus:bg-white"
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rootUrl" className="text-gray-700">URL Racine</Label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <Input 
                                    id="rootUrl" 
                                    name="rootUrl" 
                                    placeholder="https://mon-site.com" 
                                    className="pl-9 bg-gray-50 border-gray-200 focus:bg-white" 
                                    required 
                                />
                            </div>
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="text-gray-600">
                                Annuler
                            </Button>
                            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                                Créer le site
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="space-y-1 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
              {folders && folders.length > 0 ? (
                folders.map((folder) => (
                  <Link 
                    key={folder.id} 
                    href={`/site/${folder.id}`}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors group",
                        isSiteActive(folder.id.toString()) ? "bg-white/10 text-white border-l-2 border-blue-500 pl-[10px]" : "text-zinc-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
                      )}
                  >
                    <Folder className={cn("h-4 w-4 transition-colors shrink-0", isSiteActive(folder.id.toString()) ? "text-blue-400" : "text-zinc-600 group-hover:text-zinc-400")} />
                    <span className="truncate">{folder.name}</span>
                  </Link>
                ))
              ) : (
                <div className="px-3 py-4 text-center border border-dashed border-white/10 rounded-lg">
                    <p className="text-xs text-zinc-500 italic">Aucun site configuré.</p>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* 3. FOOTER : ORG SWITCHER & USER */}
        <div className="p-4 border-t border-white/10 bg-[#0A0A0A] space-y-4 shrink-0">
          
          {/* ORG SWITCHER EN BAS */}
          <div className="w-full">
            <OrgSwitcher organizations={organizations} currentOrgId={activeOrgId} />
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-white/5">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white ring-1 ring-white/10 shrink-0">
               {userEmail?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-xs font-medium text-white truncate mb-0.5" title={userEmail}>{userEmail}</p>
               <div className="flex items-center gap-3">
                   <form action="/auth/signout" method="post">
                     <button className="text-[10px] text-zinc-500 hover:text-red-400 flex items-center gap-1 transition-colors">
                       <LogOut className="h-3 w-3" /> Déconnexion
                     </button>
                   </form>
                   <span className="text-zinc-700 text-[10px]">|</span>
                   <Link href="/settings" className={cn("text-zinc-500 hover:text-white transition-colors", isActive('/settings') ? "text-white" : "")}>
                        <Settings className="h-3.5 w-3.5" />
                   </Link>
               </div>
            </div>
          </div>
        </div>
    </aside>
  )
}