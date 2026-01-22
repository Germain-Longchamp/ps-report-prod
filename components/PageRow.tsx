'use client'

import { useState } from 'react'
import { ExternalLink, Trash2, Globe, Play, Loader2, Monitor, Smartphone, AlertTriangle, AlertOctagon, Eye, LayoutList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { runPageSpeedAudit, deletePage } from '@/app/actions'
import { AuditDetails } from './AuditDetails'

interface PageRowProps {
  page: any
  folderId: string
  lastAudit: any
}

export function PageRow({ page, folderId, lastAudit }: PageRowProps) {
  const [isAuditing, setIsAuditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 1. Détection de l'erreur
  const statusCode = lastAudit?.status_code || 0
  const isError = statusCode >= 400
  // Si on a un rapport JSON complet, on peut afficher les détails
  const hasReport = !!lastAudit?.report_json

  const handleAudit = async () => {
    setIsAuditing(true)
    const res = await runPageSpeedAudit(page.url, folderId, page.id)
    setIsAuditing(false)
    if (res.error) alert(res.error)
  }

  const handleDelete = async () => {
    if(!confirm("Supprimer cette page ?")) return
    setIsDeleting(true)
    await deletePage(page.id, folderId)
  }

  const getScoreColor = (score: number) => {
    if (!score && score !== 0) return "bg-gray-100 text-gray-400 border-gray-200"
    if (score >= 90) return "bg-green-100 text-green-700 border-green-200"
    if (score >= 50) return "bg-orange-100 text-orange-700 border-orange-200"
    return "bg-red-100 text-red-700 border-red-200"
  }

  const getErrorMessage = (code: number) => {
    if (code === 404) return "Page introuvable (404)"
    if (code === 500) return "Erreur serveur (500)"
    if (code === 403) return "Accès interdit (403)"
    return `Erreur HTTP ${code}`
  }

  return (
    <div className={`
        group flex flex-col md:flex-row md:items-center justify-between p-5 rounded-xl border shadow-sm transition-all gap-4
        ${isError 
            ? 'bg-red-50/50 border-red-200 hover:border-red-300' 
            : 'bg-white border-gray-200 hover:border-blue-300'
        }
    `}>
      
      {/* 1. Info URL */}
      <div className="flex items-start gap-4 md:w-1/4 min-w-[200px]">
        <div className={`mt-1 p-2.5 rounded-lg shrink-0 ${isError ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
          {isError ? <AlertTriangle className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
        </div>
        <div className="overflow-hidden">
          <div className={`font-semibold truncate ${isError ? 'text-red-900' : 'text-gray-900'}`}>
            {page.name || "Page sans nom"}
          </div>
          <a href={page.url} target="_blank" className="text-xs text-gray-500 hover:text-blue-600 hover:underline flex items-center gap-1 mt-0.5 truncate">
            {page.url}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* 2. Scores ou Erreur */}
      <div className="flex-1">
        {isError ? (
            <div className="flex items-center gap-2 text-red-600 bg-white/50 p-2 rounded-lg border border-red-100 w-fit">
                <AlertOctagon className="h-4 w-4" />
                <span className="font-bold text-sm">{getErrorMessage(statusCode)}</span>
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50/50">
                    <span className="text-[10px] uppercase text-gray-500 font-semibold mb-1 flex items-center gap-1">
                        <Smartphone className="h-3 w-3" /> Mobile
                    </span>
                    <Badge variant="outline" className={`text-lg font-bold px-2 ${getScoreColor(lastAudit?.performance_score)}`}>
                        {lastAudit?.performance_score ?? '-'}
                    </Badge>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50/50">
                     <span className="text-[10px] uppercase text-gray-500 font-semibold mb-1 flex items-center gap-1">
                        <Monitor className="h-3 w-3" /> Desktop
                    </span>
                    <Badge variant="outline" className={`text-lg font-bold px-2 ${getScoreColor(lastAudit?.performance_desktop_score)}`}>
                        {lastAudit?.performance_desktop_score ?? '-'}
                    </Badge>
                </div>
                <ScoreBox label="SEO" score={lastAudit?.seo_score} />
                <ScoreBox label="Access." score={lastAudit?.accessibility_score} />
                <ScoreBox label="Best Pr." score={lastAudit?.best_practices_score} />
            </div>
        )}
      </div>

      {/* 3. Actions */}
      <div className="flex items-center gap-4 md:border-l md:pl-4 md:ml-2 border-gray-100">
        
        {!isError && (
             <div className="hidden lg:flex flex-col items-end mr-2">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">TTFB</span>
                <span className={`text-sm font-mono font-medium ${lastAudit?.ttfb > 600 ? 'text-red-500' : 'text-gray-700'}`}>
                    {lastAudit?.ttfb ? `${lastAudit.ttfb}ms` : '--'}
                </span>
            </div>
        )}

        <div className="flex items-center gap-2">
            
            {/* NOUVEAU : BOUTON SHEET (DÉTAILS) */}
            {hasReport && !isError && (
                <Sheet>
                    <SheetTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-9 px-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50">
                            <LayoutList className="h-4 w-4 mr-2" />
                            <span className="text-xs font-medium">Rapport</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-[600px] flex flex-col h-full bg-white p-0 border-l border-gray-200 shadow-2xl z-[100]">
                        
                        {/* Header avec fond gris léger et padding */}
                        <SheetHeader className="p-6 bg-gray-50 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                                    <LayoutList className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <SheetTitle className="text-xl font-bold text-gray-900 leading-tight">
                                        {page.name || "Détail de l'audit"}
                                    </SheetTitle>
                                    <SheetDescription className="text-xs text-gray-500 mt-1">
                                        Analyse technique détaillée par Google Lighthouse.
                                    </SheetDescription>
                                </div>
                            </div>
                        </SheetHeader>
                        
                        {/* Zone de contenu principale (Scrollable) */}
                        <div className="flex-1 overflow-hidden bg-white relative">
                             {/* On passe une classe pour le padding interne du composant */}
                             <AuditDetails report={lastAudit.report_json} />
                        </div>

                    </SheetContent>
                </Sheet>
            )}

            <Button 
                size="sm" 
                variant={isError ? "default" : "outline"} 
                onClick={handleAudit} 
                disabled={isAuditing}
                className={`h-9 w-9 p-0 rounded-full ${isError ? 'bg-red-100 text-red-600 hover:bg-red-200 border-red-200' : 'border-blue-200 hover:bg-blue-50 hover:text-blue-600'}`}
            >
                {isAuditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>

            <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDelete} 
                disabled={isDeleting}
                className="h-9 w-9 p-0 text-gray-400 hover:text-red-600"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      </div>
    </div>
  )
}

function ScoreBox({ label, score }: { label: string, score: number }) {
    let color = "text-gray-400"
    if (score >= 90) color = "text-green-600"
    else if (score >= 50) color = "text-orange-600"
    else if (score < 50 && score > 0) color = "text-red-600"

    return (
        <div className="flex flex-col items-center justify-center p-1">
            <span className="text-[10px] text-gray-400 uppercase font-semibold mb-1">{label}</span>
            <span className={`text-sm font-bold ${color}`}>
                {score ?? '-'}
            </span>
        </div>
    )
}