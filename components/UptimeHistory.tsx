'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
// Importez le type depuis utils maintenant
import { type DailyStatus } from "@/lib/utils" 

interface UptimeHistoryProps {
  history: DailyStatus[]
  size?: 'default' | 'sm' // Nouvelle prop
}

export function UptimeHistory({ history, size = 'default' }: UptimeHistoryProps) {
  const totalTracked = history.filter(h => h.status !== 'empty').length
  const totalUp = history.filter(h => h.status === 'up').length
  const uptimePercentage = totalTracked > 0 ? Math.round((totalUp / totalTracked) * 100) : 0

  // Configuration selon la taille
  const isSmall = size === 'sm'
  const barHeight = isSmall ? 'h-5' : 'h-8' // Plus petit pour les cartes
  const barGap = isSmall ? 'gap-[1px]' : 'gap-[2px]' // Plus serré pour les cartes

  return (
    <div className="flex flex-col gap-1.5 w-full"> 
      
      {/* Le Header est masqué en mode 'sm' pour gagner de la place */}
      {!isSmall && (
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            <span>60 derniers jours</span>
            <div className="flex items-center gap-2">
                <span>Disponibilité :</span>
                <span className={cn("font-bold text-xs", uptimePercentage === 100 ? "text-emerald-600" : "text-orange-600")}>
                    {totalTracked > 0 ? `${uptimePercentage}%` : '--'}
                </span>
            </div>
        </div>
      )}

      {/* Barres */}
      <div className={cn("flex items-end w-full", barGap, barHeight)}> 
        <TooltipProvider delayDuration={0}>
          {history.map((day, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div 
                  className={cn(
                    "flex-1 rounded-[1px] transition-all hover:opacity-80 cursor-help min-w-[2px]",
                    day.status === 'up' && "bg-emerald-500 h-full",
                    day.status === 'down' && "bg-red-500 h-full",
                    day.status === 'empty' && "bg-gray-100 h-full"
                  )}
                />
              </TooltipTrigger>
              <TooltipContent className="text-xs bg-slate-900 text-white border-0">
                <div className="font-bold mb-1">{day.date}</div>
                <div>
                    {day.status === 'up' && <span className="text-emerald-400">Opérationnel (200)</span>}
                    {day.status === 'down' && <span className="text-red-400">Panne ({day.code || 'ERR'})</span>}
                    {day.status === 'empty' && <span className="text-gray-400">Pas de données</span>}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  )
}
