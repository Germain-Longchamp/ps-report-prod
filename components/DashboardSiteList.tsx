'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Folder, 
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
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CreateSiteModal } from '@/components/CreateSiteModal'

interface DashboardSiteListProps {
  folders: any[]
  metrics: Record<string, { status: number | undefined, healthScore: number | null, pageCount: number }>
}

export function DashboardSiteList({ folders, metrics }: DashboardSiteListProps) {
  const [search, setSearch] = useState('')

  // Filtrage des dossiers selon la recherche
  const filteredFolders = folders.filter(folder => 
    folder.name.toLowerCase().includes(search.toLowerCase()) || 
    folder.root_url.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      
      {/* --- BARRE D'OUTILS --- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-400" />
              Vos Sites
          </h2>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                      placeholder="Filtrer par nom ou URL..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 bg-white border-gray-200 focus:bg-white transition-all h-9 text-sm"
                  />
              </div>
              <CreateSiteModal>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shrink-0 h-9">
                      <Plus className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Ajouter un site</span>
                      <span className="sm:hidden">Ajouter</span>
                  </Button>
              </CreateSiteModal>
          </div>
      </div>

      {/* --- LISTE DES CARTES (PLEINE LARGEUR) --- */}
      <div className="space-y-3">
        {filteredFolders.length > 0 ? (
           filteredFolders.map((folder) => {
              const metric = metrics[folder.id]
              const status = metric?.status
              const healthScore = metric?.healthScore
              const pageCount = metric?.pageCount || 0

              const hasAudit = status !== undefined
              const isOnline = hasAudit && (status >= 200 && status < 400)

              // 1. Logique Score Santé
              let scoreColor = "text-gray-600 bg-gray-100 border-gray-200"
              if (healthScore !== null) {
                  if (healthScore >= 80) scoreColor = "text-emerald-700 bg-emerald-50 border-emerald-200"
                  else if (healthScore >= 60) scoreColor = "text-orange-700 bg-orange-50 border-orange-200"
                  else scoreColor = "text-red-700 bg-red-50 border-red-200"
              }

              // 2. Logique SSL
              const lastAudit = folder.audits?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
              const sslExpiry = lastAudit?.ssl_expiry_date ? new Date(lastAudit.ssl_expiry_date) : null
              const sslDaysLeft = sslExpiry ? Math.ceil((sslExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
              const isSslOk = sslDaysLeft !== null && sslDaysLeft > 30

              // Style Card : Bordure colorée à gauche pour indiquer le statut
              const borderClass = hasAudit 
                  ? (isOnline ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-red-500 bg-red-50/10") 
                  : "border-l-4 border-l-gray-300"

              return (
                  <Link key={folder.id} href={`/site/${folder.id}`} className="block group">
                      <Card className={`border shadow-sm hover:shadow-md transition-all duration-200 ${borderClass}`}>
                          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                              
                              {/* 1. INFO PRINCIPALE (NOM + URL) */}
                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                      <h3 className="font-bold text-gray-900 truncate text-base group-hover:text-blue-600 transition-colors">
                                          {folder.name}
                                      </h3>
                                      {/* Status Badge (Mobile only) */}
                                      <div className={`sm:hidden h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                  </div>
                                  <div className="text-xs text-gray-500 flex items-center gap-1.5 truncate">
                                      <Globe className="h-3 w-3 text-gray-400" />
                                      {folder.root_url}
                                  </div>
                              </div>

                              {/* 2. MÉTRIQUES (ALIGNÉES À DROITE SUR DESKTOP) */}
                              <div className="flex items-center gap-4 sm:gap-8 border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0">
                                  
                                  {/* Score Santé */}
                                  <div className="flex flex-col items-center sm:items-end min-w-[60px]">
                                      <span className="text-[10px] uppercase text-gray-400 font-semibold mb-0.5">Santé</span>
                                      {healthScore !== null ? (
                                          <Badge variant="outline" className={`h-6 px-2 font-bold ${scoreColor}`}>
                                              {healthScore}/100
                                          </Badge>
                                      ) : (
                                          <span className="text-xs text-gray-400 font-mono">--</span>
                                      )}
                                  </div>

                                  {/* Pages */}
                                  <div className="flex flex-col items-center sm:items-end min-w-[60px]">
                                      <span className="text-[10px] uppercase text-gray-400 font-semibold mb-0.5">Pages</span>
                                      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
                                          <Layers className="h-3.5 w-3.5 text-gray-400" />
                                          {pageCount}
                                      </div>
                                  </div>

                                  {/* SSL */}
                                  <div className="flex flex-col items-center sm:items-end min-w-[80px]">
                                      <span className="text-[10px] uppercase text-gray-400 font-semibold mb-0.5">SSL</span>
                                      <div className="flex items-center gap-1.5 text-sm font-medium">
                                          {sslDaysLeft !== null ? (
                                              <>
                                                  {isSslOk ? <Lock className="h-3.5 w-3.5 text-emerald-500" /> : <Lock className="h-3.5 w-3.5 text-red-500" />}
                                                  <span className={!isSslOk ? "text-red-600 font-bold" : "text-gray-600"}>J-{sslDaysLeft}</span>
                                              </>
                                          ) : (
                                              <>
                                                  <Unlock className="h-3.5 w-3.5 text-gray-300" />
                                                  <span className="text-gray-400">--</span>
                                              </>
                                          )}
                                      </div>
                                  </div>

                                  {/* Chevron Action */}
                                  <div className="hidden sm:flex text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all">
                                      <ArrowRight className="h-5 w-5" />
                                  </div>

                              </div>
                          </CardContent>
                      </Card>
                  </Link>
              )
           })
        ) : (
           <div className="py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                  <Folder className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Aucun site trouvé</h3>
              <p className="text-xs text-gray-500 mt-1">
                  {search ? "Essayez de modifier votre recherche." : "Commencez par ajouter votre premier site."}
              </p>
           </div>
        )}
      </div>
    </div>
  )
}
