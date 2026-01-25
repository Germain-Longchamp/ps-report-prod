'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Folder, 
  Plus, 
  AlertOctagon, 
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { OrgSwitcher } from './OrgSwitcher'
import { CreateSiteModal } from './CreateSiteModal' // <--- IMPORT

interface DashboardSidebarProps {
  userEmail: string | undefined
  folders: any[] | null
  incidentCount: number
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
  const isActive = (path: string) => pathname === path
  const isSiteActive = (id: string) => pathname === `/site/${id}`

  return (
    <aside className="w-64 bg-[#0A0A0A] text-white hidden md:flex flex-col fixed inset-y-0 z-50 border-r border-white/10">
        
        {/* HEADER */}
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

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar">
          
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

          {/* LISTE DES SITES */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Vos Sites</h3>
              
              {/* UTILISATION DU NOUVEAU COMPOSANT MODALE */}
              <CreateSiteModal>
                <button className="text-zinc-500 hover:text-white transition-colors p-1 rounded hover:bg-white/10">
                    <Plus className="h-4 w-4" />
                </button>
              </CreateSiteModal>

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

        {/* FOOTER */}
        <div className="p-4 border-t border-white/10 bg-[#0A0A0A] space-y-4 shrink-0">
          
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