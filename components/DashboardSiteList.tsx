'use client'

import { useState } from 'react'
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
  ArrowRight
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CreateSiteModal } from '@/components/CreateSiteModal'
import { cn, generate60DayHistory } from '@/lib/utils'
import { UptimeHistory } from '@/components/UptimeHistory'

interface DashboardSiteListProps {
  folders: any[]
  metrics: Record<string, { status: number | undefined, healthScore: number | null, pageCount: number }>
}

export function DashboardSiteList({ folders, metrics }: DashboardSiteListProps) {
  const [search, setSearch] = useState('')

  const filteredFolders = folders.filter(folder => 
    folder.name.toLowerCase().includes(search.toLowerCase()) || 
    folder.root_url.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      
      {/* --- BARRE D'OUTILS --- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-500" />
              Vos Sites
          </h2>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input 
                      placeholder="Rechercher..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 bg-white border-gray-200 focus:bg-white transition-all h-9 text-xs"
                  />
              </div>
              <CreateSiteModal>
                  <Button size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm shrink-0 h-9 text-xs font-medium">
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      <span className="hidden sm:inline">Nouveau site</span>
                      <span className="sm:hidden">Ajouter</span>
                  </Button>
              </CreateSiteModal>
          </div>
      </div>

      {/* --- LISTE SUPER ROW --- */}
      <div className="space-y-2">
        {filteredFolders.length > 0 ? (
           filteredFolders.map((folder) => {
              const metric = metrics[folder.id]
              const status = metric?.status
              const healthScore = metric?.healthScore
              const pageCount = metric?.pageCount || 0

              const hasAudit = status !== undefined
              const isOnline = hasAudit && (status >= 200 && status < 400)

              // Couleurs dynamiques
              let scoreClass = "text-zinc-500 bg-zinc-50 border-zinc-200"
              if (healthScore !== null) {
                  if (healthScore >= 90) scoreClass = "text-emerald-700 bg-emerald-50 border-emerald-200"
                  else if (healthScore >= 50) scoreClass = "text-orange-700 bg-orange-50 border-orange-200"
                  else scoreClass = "text-red-700 bg-red-50 border-red-200"
              }

              // SSL
              const sortedAudits = folder.audits?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || []
              const lastAudit = sortedAudits[0]
              const sslExpiry = lastAudit?.ssl_expiry_date ? new Date(lastAudit.ssl_expiry_date) : null
              const sslDaysLeft = sslExpiry ? Math.ceil((sslExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
              const isSslOk = sslDaysLeft !== null && sslDaysLeft > 30

              // Historique
              const uptimeHistory = generate60DayHistory(sortedAudits)

              // Couleur latérale
              const statusLineColor = hasAudit 
                  ? (isOnline ? "bg-emerald-500" : "bg-red-500") 
                  : "bg-zinc-300"

              return (
                  <Link key={folder.id} href={`/site/${folder.id}`} className="block group">
                      <Card className="relative overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-blue-300/50 transition-all duration-200">
                          
                          {/* Ligne de statut latérale */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusLineColor}`} />

                          {/* CONTENEUR FLEX UNIQUE (SUPER ROW) */}
                          {/* py-2 appliqué ici comme demandé */}
                          <div className="flex flex-col lg:flex-row lg:items-center py-2 pl-5 pr-3 gap-4 lg:gap-6 min-h-[60px]">
                              
                              {/* 1. IDENTITÉ (Fixe) */}
                              <div className="flex flex-col justify-center gap-0.5 lg:w-[220px] shrink-0">
                                  <div className="flex items-center gap-2">
                                      <h3 className="font-bold text-gray-900 truncate text-sm group-hover:text-blue-600 transition-colors">
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
                              <div className="flex-1 flex flex-col justify-end h-8 lg:h-auto pt-2 lg:pt-0">
                                  <div className="w-full flex items-end opacity-80 group-hover:opacity-100 transition-opacity">
                                    <UptimeHistory history={uptimeHistory} size="sm" />
                                  </div>
                              </div>

                              {/* 3. CAPSULES MÉTRIQUES (Droite) */}
                              <div className="flex items-center justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-50">
                                  
                                  {/* Score */}
                                  <div className={cn("hidden sm:flex flex-col items-center justify-center w-[45px] h-[36px] rounded border bg-zinc-50", scoreClass)}>
                                      <span className="text-[8px] font-bold uppercase opacity-60 leading-none mb-0.5">Score</span>
                                      <span className="font-mono text-xs font-bold leading-none">{healthScore ?? '-'}</span>
                                  </div>

                                  {/* Pages */}
                                  <div className="flex flex-col items-center justify-center w-[45px] h-[36px] rounded border border-gray-100 bg-white text-gray-500">
                                      <span className="text-[8px] font-bold uppercase opacity-60 leading-none mb-0.5">Pages</span>
                                      <span className="font-mono text-xs font-bold leading-none">{pageCount}</span>
                                  </div>

                                  {/* SSL */}
                                  <div className={cn("flex flex-col items-center justify-center min-w-[55px] h-[36px] px-1 rounded border", 
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
