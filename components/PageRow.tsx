'use client'

import { useState } from 'react'
import { ExternalLink, Trash2, Globe, Play, Loader2, Monitor, Smartphone, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { runPageSpeedAudit, deletePage } from '@/app/actions'
import { toast } from 'sonner' // ou alert si pas de toast

// Type pour les données qu'on va recevoir
interface PageRowProps {
  page: any
  folderId: string
  lastAudit: any // L'audit le plus récent pour cette page
}

export function PageRow({ page, folderId, lastAudit }: PageRowProps) {
  const [isAuditing, setIsAuditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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
    // Pas besoin de setIsDeleting(false) car le composant sera démonté
  }

  // Helper pour les couleurs de scores (Rouge / Orange / Vert)
  const getScoreColor = (score: number) => {
    if (!score && score !== 0) return "bg-gray-100 text-gray-400"
    if (score >= 90) return "bg-green-100 text-green-700 border-green-200"
    if (score >= 50) return "bg-orange-100 text-orange-700 border-orange-200"
    return "bg-red-100 text-red-700 border-red-200"
  }

  return (
    <div className="group flex flex-col md:flex-row md:items-center justify-between p-5 rounded-xl border border-gray-200 bg-white shadow-sm hover:border-blue-200 transition-all gap-4">
      
      {/* 1. Info URL & Nom */}
      <div className="flex items-start gap-4 md:w-1/4 min-w-[200px]">
        <div className="mt-1 p-2.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
          <Globe className="h-5 w-5" />
        </div>
        <div className="overflow-hidden">
          <div className="font-semibold text-gray-900 truncate">
            {page.name || "Page sans nom"}
          </div>
          <a href={page.url} target="_blank" className="text-xs text-gray-500 hover:text-blue-600 hover:underline flex items-center gap-1 mt-0.5 truncate">
            {page.url}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* 2. Les Scores (La partie intéressante) */}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3">
        
        {/* Perf Mobile */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50">
            <span className="text-[10px] uppercase text-gray-500 font-semibold mb-1 flex items-center gap-1">
                <Smartphone className="h-3 w-3" /> Mobile
            </span>
            <Badge variant="outline" className={`text-lg font-bold px-2 ${getScoreColor(lastAudit?.performance_score)}`}>
                {lastAudit?.performance_score ?? '-'}
            </Badge>
        </div>

        {/* Perf Desktop */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50">
             <span className="text-[10px] uppercase text-gray-500 font-semibold mb-1 flex items-center gap-1">
                <Monitor className="h-3 w-3" /> Desktop
            </span>
            <Badge variant="outline" className={`text-lg font-bold px-2 ${getScoreColor(lastAudit?.performance_desktop_score)}`}>
                {lastAudit?.performance_desktop_score ?? '-'}
            </Badge>
        </div>

        {/* SEO / Access / BP (Regroupés visuellement ou séparés) */}
        <ScoreBox label="SEO" score={lastAudit?.seo_score} />
        <ScoreBox label="Access." score={lastAudit?.accessibility_score} />
        <ScoreBox label="Best Pr." score={lastAudit?.best_practices_score} />
      </div>

      {/* 3. TTFB & Actions */}
      <div className="flex items-center gap-4 md:border-l md:pl-4 md:ml-2 border-gray-100">
        
        {/* TTFB */}
        <div className="hidden lg:flex flex-col items-end mr-2">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">TTFB</span>
            <span className={`text-sm font-mono font-medium ${lastAudit?.ttfb > 600 ? 'text-red-500' : 'text-gray-700'}`}>
                {lastAudit?.ttfb ? `${lastAudit.ttfb}ms` : '--'}
            </span>
        </div>

        {/* Bouton Audit */}
        <Button 
            size="sm" 
            variant="outline" 
            onClick={handleAudit} 
            disabled={isAuditing}
            className="h-9 w-9 p-0 rounded-full border-blue-200 hover:bg-blue-50 hover:text-blue-600"
        >
            {isAuditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 ml-0.5" />}
        </Button>

        {/* Bouton Delete */}
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
  )
}

// Petit composant helper pour les 3 petites boites
function ScoreBox({ label, score }: { label: string, score: number }) {
    // Logique couleur simplifiée
    let color = "text-gray-400"
    if (score >= 90) color = "text-green-600"
    else if (score >= 50) color = "text-orange-600"
    else if (score < 50 && score > 0) color = "text-red-600"

    return (
        <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] text-gray-400 uppercase font-semibold mb-1">{label}</span>
            <span className={`text-sm font-bold ${color}`}>
                {score ?? '-'}
            </span>
        </div>
    )
}