'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  BarChart3, 
  Globe, 
  Lock, 
  Unlock, 
  Layers,
  Search,
  Plus,
  Activity,
  ArrowRight,
  ListFilter
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CreateSiteModal } from '@/components/CreateSiteModal'
import { cn, generate60DayHistory } from '@/lib/utils'
import { UptimeHistory } from '@/components/UptimeHistory'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DashboardSiteListProps {
  folders: any[]
  metrics: Record<string, { status: number | undefined, healthScore: number | null, pageCount: number }>
}

type SortOption = 'default' | 'score_asc' | 'score_desc' | 'ssl_asc' | 'ssl_desc'

export function DashboardSiteList({ folders, metrics }: DashboardSiteListProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('default')

  // 1. PRÉ-CALCUL DES DONNÉES (Pour permettre le tri)
  const processedFolders = useMemo(() => {
    return folders.map(folder => {
      const metric = metrics[folder.id]
      const status = metric?.status
      const healthScore = metric?.healthScore
      const pageCount = metric?.pageCount || 0
      
      const hasAudit = status !== undefined
      const isOnline = hasAudit && (status >= 200 && status < 400)

      // Logique SSL & Uptime
      const sortedAudits = folder.audits?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || []
      const lastAudit = sortedAudits[0]
      const sslExpiry = lastAudit?.ssl_expiry_date ? new Date(lastAudit.ssl_expiry_date) : null
      const sslDaysLeft = sslExpiry ? Math.ceil((sslExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
      const isSslOk = sslDaysLeft !== null && sslDaysLeft > 30
      
      const uptimeHistory = generate60DayHistory(sortedAudits)

      return {
        ...folder,
        computed: {
          isOnline,
          hasAudit,
          healthScore,
          pageCount,
          sslDaysLeft,
          isSslOk,
          uptimeHistory
        }
      }
    })
  }, [folders, metrics])

  // 2. FILTRAGE & TRI
  const filteredAndSortedFolders = useMemo(() => {
    let result = processedFolders.filter(item => 
      item.name.toLowerCase().includes(search.toLowerCase()) || 
      item.root_url.toLowerCase().includes(search.toLowerCase())
    )

    switch (sort) {
      case 'score_desc':
        return result.sort((a, b) => (b.computed.healthScore || 0) - (a.computed.healthScore || 0))
      case 'score_asc':
        return result.sort((a, b) => (a.computed.healthScore || 0) - (b.computed.healthScore || 0))
      case 'ssl_asc': // Expire bientôt en premier
        return result.sort((a, b) => (a.computed.sslDaysLeft || 9999) - (b.computed.sslDaysLeft || 9999))
      case 'ssl_desc':
        return result.sort((a, b) => (b.computed.sslDaysLeft || 0) - (a.computed.sslDaysLeft || 0))
      default:
        return result
    }
  }, [processedFolders, search, sort])

  return (
    <div className="space-y-6">
      
      {/* --- EN-TÊTE --- */}
      <div className="space-y-4">
          
          {/* ROW 1 : TITRE + ACTION PRINCIPALE */}
          <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Activity className="h-6 w-6 text-gray-600" />
                  Vos Sites
              </h2>
              <CreateSiteModal>
                  <Button size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm h-9 px-4 font-medium">
                      <Plus className="h-4 w-4 mr-2" />
                      Nouveau site
                  </Button>
              </CreateSiteModal>
          </div>

          {/* ROW 2 : FILTRES & TRI */}
          <div className="flex flex-col sm:flex-row gap-3">
              {/* Barre de recherche */}
              <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                      placeholder="Rechercher par nom ou URL..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 bg-white border-gray-200 h-10 text-sm"
                  />
              </div>

              {/* Boutons de Tri */}
              <div className="flex gap-2 shrink-0">
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="h-10 px-3 gap-2 bg-white border-gray-200 text-gray-700">
                              <ListFilter className="h-4 w-4" />
                              <span className="hidden sm:inline">Trier par</span>
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setSort('default')}>
                              Par défaut (Date)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSort('score_desc')}>
                              <BarChart3 className="h-4 w-4 mr-2 text-gray-400" /> Score : Haut → Bas
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSort('score_asc')}>
                              <BarChart3 className="h-4 w-4 mr-2 text-gray-400" /> Score : Bas → Haut
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSort('ssl_asc')}>
                              <Lock className="h-4 w-4 mr-2 text-gray-400" /> SSL : Expire bientôt
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
              </div>
          </div>
      </div>

      {/* --- ROW 3 : LISTE SUPER COMPACTE --- */}
      <div className="space-y-2">
        {filteredAndSortedFolders.length > 0 ? (
           filteredAndSortedFolders.map((folder) => {
              const { isOnline, hasAudit, healthScore, pageCount, sslDaysLeft, isSslOk, uptimeHistory } = folder.computed

              // Couleurs dynamiques
              let scoreClass = "text-zinc-500 bg-zinc-50 border-zinc-200"
              if (healthScore !== null) {
                  if (healthScore >= 90) scoreClass = "text-emerald-700 bg-emerald-50 border-emerald-200"
                  else if (healthScore >= 50) scoreClass = "text-orange-700 bg-orange-50 border-orange-200"
                  else scoreClass = "text-red-700 bg-red-50 border-red-200"
              }

              const statusLineColor = hasAudit 
                  ? (isOnline ? "bg-emerald-500" : "bg-red-500") 
                  : "bg-zinc-300"

              return (
                  <Link key={folder.id} href={`/site/${folder.id}`} className="block group">
                      <Card className="relative overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-blue-300/50 transition-all duration-200">
                          
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusLineColor}`} />

                          {/* CONTENEUR FLEX ULTRA-COMPACT (py-1.5) */}
                          <div className="flex flex-col lg:flex-row lg:items-center py-1.5 pl-4 pr-2 gap-3 lg:gap-6 min-h-[56px]">
                              
                              {/* 1. IDENTITÉ (Fixe) */}
                              <div className="flex flex-col justify-center gap-0.5 lg:w-[220px] shrink-0">
                                  <div className="flex items-center gap-2">
                                      <h3 className="font-bold text-gray-900 truncate text-sm leading-none group-hover:text-blue-600 transition-colors">
                                          {folder.name}
                                      </h3>
                                      {!isOnline && hasAudit && (
                                          <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 lg:hidden" />
                                      )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 group-hover:text-gray-600">
                                      <Globe className="h-2.5 w-2.5" />
                                      <span className="truncate font-mono">{folder.root_url}</span>
                                  </div>
                              </div>

                              {/* 2. UPTIME HISTORY (Central & Élastique) */}
                              <div className="flex-1 flex flex-col justify-end h-6 lg:h-auto pt-1 lg:pt-0">
                                  <div className="w-full flex items-end opacity-75 group-hover:opacity-100 transition-opacity">
                                    <UptimeHistory history={uptimeHistory} size="sm" />
                                  </div>
                              </div>

                              {/* 3. CAPSULES MÉTRIQUES (Droite) */}
                              <div className="flex items-center justify-end gap-2 shrink-0 pt-1 lg:pt-0 border-t lg:border-t-0 border-gray-50">
                                  
                                  {/* Score (Hauteur réduite h-8) */}
                                  <div className={cn("hidden sm:flex flex-col items-center justify-center w-[45px] h-8 rounded border bg-zinc-50", scoreClass)}>
                                      <span className="text-[8px] font-bold uppercase opacity-60 leading-none mb-0.5">Score</span>
                                      <span className="font-mono text-xs font-bold leading-none">{healthScore ?? '-'}</span>
                                  </div>

                                  {/* Pages */}
                                  <div className="flex flex-col items-center justify-center w-[45px] h-8 rounded border border-gray-100 bg-white text-gray-500">
                                      <span className="text-[8px] font-bold uppercase opacity-60 leading-none mb-0.5">Pages</span>
                                      <span className="font-mono text-xs font-bold leading-none">{pageCount}</span>
                                  </div>

                                  {/* SSL */}
                                  <div className={cn("flex flex-col items-center justify-center min-w-[55px] h-8 px-1 rounded border", 
                                      isSslOk ? "bg-white border-gray-100 text-gray-500" : "bg-red-50 border-red-100 text-red-600"
                                  )}>
                                      <span className="text-[8px] font-bold uppercase opacity-60 leading-none mb-0.5">SSL</span>
                                      <div className="flex items-center gap-1 leading-none">
                                          {!isSslOk && <Unlock className="h-2.5 w-2.5" />}
                                          <span className="font-mono text-xs font-bold">
                                              {sslDaysLeft !== null ? `${sslDaysLeft}j` : '-'}
                                          </span>
                                      </div>
                                  </div>

                                  {/* Flèche Action */}
                                  <div className="hidden lg:flex items-center justify-center w-8 h-8 rounded-full hover:bg-zinc-100 text-gray-300 group-hover:text-blue-600 transition-all ml-1">
                                      <ArrowRight className="h-4 w-4" />
                                  </div>

                              </div>
                          </div>
                      </Card>
                  </Link>
              )
           })
        ) : (
           <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/30">
              <div className="bg-white p-3 rounded-full shadow-sm mb-3 border border-gray-100">
                  <Folder className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Aucun site trouvé</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  {search ? "Essayez une autre recherche." : "Commencez par ajouter votre premier site."}
              </p>
           </div>
        )}
      </div>
    </div>
  )
}
