'use client'

import Link from "next/link";
import { LayoutDashboard, Bell, Lock, Settings, LogOut } from "lucide-react";
import { OrgSwitcher } from "./OrgSwitcher"; // Assure-toi d'avoir créé ce composant à l'étape précédente
import { CreateSiteModal } from "./CreateSiteModal";

interface SidebarProps {
  userEmail: string;
  organizations: any[];
  activeOrgId: number;
}

export function Sidebar({ userEmail, organizations, activeOrgId }: SidebarProps) {
  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen shadow-xl border-r border-slate-800">
      
      {/* 1. HEADER AVEC SWITCHER D'ORGANISATION */}
      <div className="p-4 border-b border-slate-800">
        <OrgSwitcher organizations={organizations} currentOrgId={activeOrgId} />
      </div>

      {/* 2. MENU PRINCIPAL */}
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        
        {/* Section Navigation */}
        <div className="space-y-1">
            <div className="text-xs uppercase text-slate-500 font-bold px-3 mb-2 tracking-wider">
                Plateforme
            </div>
            
            <Link href="/" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-all group">
                <LayoutDashboard className="h-5 w-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                <span className="text-sm font-medium">Vue d'ensemble</span>
            </Link>

            <Link href="/ssl" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-all group">
                <Lock className="h-5 w-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                <span className="text-sm font-medium">Certificats SSL</span>
            </Link>

            <Link href="/alerts" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-all group">
                <Bell className="h-5 w-5 text-slate-400 group-hover:text-red-400 transition-colors" />
                <span className="text-sm font-medium">Alertes & Incidents</span>
            </Link>
        </div>

        {/* Section Configuration */}
        <div className="space-y-1">
            <div className="text-xs uppercase text-slate-500 font-bold px-3 mb-2 tracking-wider">
                Configuration
            </div>

            <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-all group">
                <Settings className="h-5 w-5 text-slate-400 group-hover:text-purple-400 transition-colors" />
                <span className="text-sm font-medium">Paramètres</span>
            </Link>
        </div>

      </div>

      {/* 3. FOOTER (Action Rapide + User Profile) */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-4">
        
        {/* Bouton d'action principal (Ajouter un site) */}
        <CreateSiteModal />

        {/* Profil Utilisateur & Déconnexion */}
        <div className="pt-2">
            <div className="flex items-center gap-3 px-2 py-2 mb-1 rounded-lg hover:bg-slate-800 transition-colors cursor-default">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                    {userEmail?.[0].toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium text-white truncate" title={userEmail}>{userEmail}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        En ligne
                    </p>
                </div>
            </div>
            
            <form action="/auth/signout" method="post">
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-red-400 transition-colors rounded hover:bg-red-950/20">
                    <LogOut className="h-3.5 w-3.5" />
                    Se déconnecter
                </button>
            </form>
        </div>

      </div>
    </aside>
  );
}