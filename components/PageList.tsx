'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Search, 
  ArrowUpDown, 
  Smartphone, 
  Monitor, 
  Search as SearchIcon, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Trash2,
  MoreVertical
} from 'lucide-react'
import { deletePage } from '@/app/actions' // Assurez-vous d'importer votre server action
import { toast } from "sonner"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Petit helper pour les couleurs de score
const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  if (score >= 50) return 'text-orange-600 bg-orange-50 border-orange-200'
  return 'text-red-600 bg-red-50 border-red-200'
}

export function PageList({ initialPages, folderId }: { initialPages: any[], folderId: string }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('date') // date, mobile, desktop, seo, best-practices, accessibility

  // --- LOGIQUE DE SUPPRESSION ---
  const handleDelete = async (pageId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette page ?")) return
    
    const res = await deletePage(pageId, folderId)
    if (res.error) toast.error(res.error)
    else toast.success("Page supprimée")
  }

  // --- LOGIQUE DE FILTRE & TRI ---
  const filteredPages = initialPages
    .filter(page => page.name.toLowerCase().includes(search.toLowerCase()) || page.url.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      // Helper pour récupérer le dernier audit
      const getLastAudit = (p: any) => p.audits?.sort((x:any, y:any) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())[0]
      
      const auditA = getLastAudit(a)
      const auditB = getLastAudit(b)

      // Si pas d'audit, on met à la fin
      if (!auditA) return 1
      if (!auditB) return -1

      switch (sortBy) {
        case 'mobile':
          return (auditA.performance_score || 0) - (auditB.performance_score || 0) // Croissant (les pires en premier)
        case 'desktop':
          return (auditA.performance_desktop_score || 0) - (auditB.performance_desktop_score || 0)
        case 'seo':
          return (auditA.seo_score || 0) - (auditB.seo_score || 0)
        case 'best-practices':
          return (auditA.best_practices_score || 0) - (auditB.best_practices_score || 0)
        case 'accessibility':
          return (auditA.accessibility_score || 0) - (auditB.accessibility_score || 0)
        default:
          // Par défaut : date de création (plus récent en haut)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  return (
    <div className="space-y-6">
      
      {/* --- BARRE D'OUTILS --- */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        
        {/* Recherche */}
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input 
                type="text" 
                placeholder="Rechercher une page..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
            />
        </div>

        {/* Tri */}
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden sm:block">Trier par :</span>
            <div className="relative">
                <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="h-9 pl-3 pr-8 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 cursor-pointer appearance-none font-medium text-gray-700"
                >
                    <option value="date">Plus récents</option>
                    <option value="mobile">Score Mobile (Croissant)</option>
                    <option value="desktop">Score Desktop (Croissant)</option>
                    <option value="seo">Score SEO (Croissant)</option>
                    <option value="best-practices">Bonnes Pratiques (Croissant)</option>
                    <option value="accessibility">Accessibilité (Croissant)</option>
                </select>
                <ArrowUpDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
        </div>
      </div>

      {/* --- LISTE DES RÉSULTATS --- */}
      <div className="space-y-3">
        {filteredPages.length > 0 ? (
            filteredPages.map((page) => {
                // Récupération dernier audit
                const lastAudit = page.audits?.sort((a:any, b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                const hasAudit = !!lastAudit
                const isError = hasAudit && lastAudit.status_code >= 400

                return (
                    <div key={page.id} className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-4 flex flex-col md:flex-row md:items-center gap-6">
                        
                        {/* Infos Page */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-gray-900 truncate">{page.name}</h3>
                                {isError && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Erreur {lastAudit.status_code}</Badge>}
                            </div>
                            <a href={page.url} target="_blank" className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 truncate transition-colors">
                                {page.url} <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>

                        {/* Scores (Grille) */}
                        {hasAudit && !isError ? (
                            <div className="flex items-center gap-2 md:gap-6 shrink-0 overflow-x-auto pb-2 md:pb-0">
                                
                                {/* Mobile */}
                                <div className="flex flex-col items-center min-w-[60px]">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1">
                                        <Smartphone className="h-3 w-3" /> Mobile
                                    </span>
                                    <div className={`text-sm font-bold px-2 py-0.5 rounded border ${getScoreColor(lastAudit.performance_score)}`}>
                                        {lastAudit.performance_score}
                                    </div>
                                </div>

                                {/* Desktop */}
                                <div className="flex flex-col items-center min-w-[60px]">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1">
                                        <Monitor className="h-3 w-3" /> Desk
                                    </span>
                                    <div className={`text-sm font-bold px-2 py-0.5 rounded border ${getScoreColor(lastAudit.performance_desktop_score)}`}>
                                        {lastAudit.performance_desktop_score}
                                    </div>
                                </div>

                                {/* SEO */}
                                <div className="flex flex-col items-center min-w-[60px]">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1">
                                        <SearchIcon className="h-3 w-3" /> SEO
                                    </span>
                                    <div className={`text-sm font-bold px-2 py-0.5 rounded border ${getScoreColor(lastAudit.seo_score)}`}>
                                        {lastAudit.seo_score}
                                    </div>
                                </div>
                                
                                {/* Autres (cachés sur tout petit écran pour aérer) */}
                                <div className="hidden lg:flex flex-col items-center min-w-[60px]">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> Best
                                    </span>
                                    <div className={`text-sm font-bold px-2 py-0.5 rounded border ${getScoreColor(lastAudit.best_practices_score)}`}>
                                        {lastAudit.best_practices_score}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="shrink-0 text-sm text-gray-400 italic px-4">
                                {isError ? "Audit impossible (Erreur)" : "En attente d'analyse..."}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="shrink-0 flex items-center pl-4 border-l border-gray-100">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-black">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleDelete(page.id)} className="text-red-600 focus:text-red-600 cursor-pointer">
                                        <Trash2 className="h-4 w-4 mr-2" /> Supprimer la page
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                             </DropdownMenu>
                        </div>

                    </div>
                )
            })
        ) : (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <p className="text-gray-500 text-sm">Aucune page ne correspond à votre recherche.</p>
            </div>
        )}
      </div>
    </div>
  )
}