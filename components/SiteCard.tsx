import { Globe, ArrowRight, Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// On définit les propriétés que la carte reçoit
interface SiteCardProps {
  id: number;
  name: string;
  url: string;
  status: string; // 'up', 'down', 'unknown'
}

export function SiteCard({ id, name, url, status }: SiteCardProps) {
  // Petite logique pour la couleur du point de statut
  let statusColor = "bg-gray-300"; // Unknown
  if (status === "up") statusColor = "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
  if (status === "down") statusColor = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]";

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 group">
      
      <div className="flex items-start justify-between mb-4">
        {/* Icône du site */}
        <div className="bg-blue-50 p-3 rounded-lg group-hover:bg-blue-100 transition-colors">
          <Globe className="h-6 w-6 text-blue-600" />
        </div>
        
        {/* Pastille de statut (Up/Down) */}
        <div className="flex items-center gap-2">
           <span className={`h-3 w-3 rounded-full ${statusColor}`} title={`Statut: ${status}`} />
        </div>
      </div>
      
      <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">{name}</h3>
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-sm text-gray-400 hover:text-blue-500 mb-6 block truncate transition-colors"
      >
        {url}
      </a>
      
      <div className="pt-4 border-t border-gray-50 flex gap-2">
         {/* Bouton Voir le détail (On créera la page plus tard) */}
         <Button variant="outline" className="w-full justify-between group-hover:border-blue-200 group-hover:bg-blue-50/50" asChild>
            <Link href={`/site/${id}`}>
              Tableau de bord <ArrowRight className="h-4 w-4 ml-2 text-gray-400 group-hover:text-blue-600" />
            </Link>
         </Button>
      </div>

    </div>
  )
}