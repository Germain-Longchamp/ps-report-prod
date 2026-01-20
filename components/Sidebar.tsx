import { LayoutDashboard, Bell, Globe, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateSiteModal } from "./CreateSiteModal";

// On définit à quoi ressemble un dossier pour que TypeScript comprenne
interface Folder {
  id: number;
  name: string;
}

// Le composant accepte une liste de dossiers (folders) comme "propriété"
export function Sidebar({ folders }: { folders: Folder[] | null }) {
  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen shadow-xl border-r border-slate-800">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg">
          <LayoutDashboard className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight">PS Report</span>
      </div>

      {/* Menu Principal */}
      <div className="p-4 space-y-2">
        <div className="text-xs uppercase text-slate-500 font-semibold px-4 mb-2">Menu</div>
        
        <Link href="/" className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 text-blue-400 rounded-lg transition-colors">
          <LayoutDashboard className="h-4 w-4" />
          <span className="text-sm font-medium">Tableau de bord</span>
        </Link>

        <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
          <Bell className="h-4 w-4" />
          <span className="text-sm font-medium">Notifications</span>
        </button>
      </div>

      {/* Liste des Dossiers (Sites) DYNAMIQUE */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-xs uppercase text-slate-500 font-semibold px-4 mb-2">Vos Sites Web</div>
        
        <ul className="space-y-1">
          {/* Si on a des dossiers, on les affiche. Sinon, message vide. */}
          {folders && folders.length > 0 ? (
            folders.map((folder) => (
              <li key={folder.id}>
                <button className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white transition-colors text-left">
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm truncate">{folder.name}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-4 text-xs text-slate-600 italic">Aucun dossier</li>
          )}
        </ul>
      </div>

      {/* Footer Sidebar */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        
        {/* On remplace l'ancien bouton par notre Modale */}
        <CreateSiteModal />
        
        <Link 
          href="/settings" 
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
        >
          {/* Vous pouvez changer l'icône ici */}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          Paramètres
        </Link>
      </div>
    </aside>
  );
}