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
  Activity
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
                      className="pl-9 bg-white border-gray-200 focus:bg-white transition-all"
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

              // 2. Logique SSL (Calculée ici car dépendante des données brutes audit)
              const lastAudit = folder.audits?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
              const sslExpiry = lastAudit?.ssl_expiry_date ? new Date(lastAudit.ssl_expiry_date) : null
              const sslDaysLeft = sslExpiry ? Math.ceil((sslExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
              const isSslOk = sslDaysLeft !== null && sslDaysLeft > 30

              // Style Card
              const cardStyle = hasAudit 
                  ? (isOnline 
                      ? 'border-gray-200 bg-gradient-to-br from-white to-gray-50/50 hover:to-white hover:border-emerald-400' 
                      : 'border-red-200 bg-red-50/30 hover:border-red-400') 
                  : 'border-gray-200 bg-gradient-to-br from-white to-gray-50/50 hover:to-white hover:border-blue-400'

              return (
                  <Link key={folder.id} href={`/site/${folder.id}`} className="group block h-full">
                      <Card className={`h-full border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${cardStyle}`}>
                          <CardContent className="p-5 flex flex-col gap-4">
                              
                              {/* Ligne 1 : Statut Visuel + Nom + Score */}
                              <div className="flex items-start gap-3">
                                  <div className={`shrink-0 mt-1 h-3 w-3 rounded-full shadow-sm ring-4 transition-all duration-500
                                      ${hasAudit 
                                          ? (isOnline ? 'bg-emerald-500 ring-emerald-100 group-hover:ring-emerald-200' : 'bg-red-500 ring-red-100 animate-pulse') 
                                          : 'bg-gray-300 ring-gray-100'
                                      }
                                  `} />
                                  <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between mb-1">
                                          <h3 className="font-bold text-gray-900 truncate text-sm">{folder.name}</h3>
                                          {healthScore !== null && (
                                              <Badge variant="outline" className={`text-[10px] h-5 px-1.5 font-bold flex items-center gap-1 ${scoreColor}`}>
                                                  <BarChart3 className="h-3 w-3" />
                                                  {healthScore}
                                              </Badge>
                                          )}
                                      </div>
                                      <div className="text-xs text-gray-500 truncate flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                                          <Globe className="h-2.5 w-2.5" />
                                          {folder.root_url}
                                      </div>
                                  </div>
                              </div>

                              {/* Séparateur léger */}
                              <div className="h-px bg-gray-100 w-full" />

                              {/* Ligne 2 : Infos Techniques (SSL + Pages) */}
                              <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                                  
                                  {/* Bloc SSL */}
                                  <div className="flex items-center gap-1.5" title={sslExpiry ? `Expire le ${sslExpiry.toLocaleDateString()}` : "Pas d'info SSL"}>
                                      {sslDaysLeft !== null ? (
                                          <>
                                              {isSslOk ? (
                                                  <Lock className="h-3.5 w-3.5 text-emerald-500" />
                                              ) : (
                                                  <Lock className="h-3.5 w-3.5 text-red-500" />
                                              )}
                                              <span className={!isSslOk ? "text-red-600 font-bold" : ""}>
                                                  J-{sslDaysLeft}
                                              </span>
                                          </>
                                      ) : (
                                          <>
                                              <Unlock className="h-3.5 w-3.5 text-gray-300" />
                                              <span className="text-gray-400">SSL --</span>
                                          </>
                                      )}
                                  </div>

                                  {/* Bloc Pages */}
                                  <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                      <Layers className="h-3.5 w-3.5 text-gray-400" />
                                      <span>{pageCount} page{pageCount > 1 ? 's' : ''}</span>
                                  </div>

                              </div>

                          </CardContent>
                      </Card>
                  </Link>
              )
           })
        ) : (
           <div className="col-span-full py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/30">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                  <Folder className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Aucun site trouvé</h3>
              <p className="text-gray-500 mt-2 max-w-sm">
                  {search ? "Aucun résultat pour votre recherche." : "Cette organisation est vide. Ajoutez votre premier site pour commencer."}
              </p>
           </div>
        )}
      </div>
    </div>
  )
}
