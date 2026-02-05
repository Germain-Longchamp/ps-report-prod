'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type DailyStatus = {
  date: string
  status: 'up' | 'down' | 'empty'
  code?: number
}

export function UptimeHistory({ history }: { history: DailyStatus[] }) {
  // Calcul du % d'uptime sur la période affichée
  const totalTracked = history.filter(h => h.status !== 'empty').length
  const totalUp = history.filter(h => h.status === 'up').length
  const uptimePercentage = totalTracked > 0 ? Math.round((totalUp / totalTracked) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="font-medium text-gray-700">Disponibilité (60 jours)</span>
        <span className={cn("font-bold", uptimePercentage === 100 ? "text-emerald-600" : uptimePercentage >= 90 ? "text-orange-600" : "text-red-600")}>
            {totalTracked > 0 ? `${uptimePercentage}%` : '--'}
        </span>
      </div>

      <div className="flex gap-[3px] h-8 sm:h-10 items-end">
        <TooltipProvider delayDuration={0}>
          {history.map((day, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div 
                  className={cn(
                    "flex-1 rounded-[1px] transition-all hover:scale-110 hover:opacity-80 cursor-help min-w-[3px]",
                    day.status === 'up' && "bg-emerald-500 h-full",
                    day.status === 'down' && "bg-red-500 h-full",
                    day.status === 'empty' && "bg-gray-100 h-full" // h-full pour garder l'alignement, ou h-1/2 pour marquer le vide
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
      
      <div className="flex justify-between text-xs text-muted-foreground uppercase font-medium tracking-wider">
        <span>Il y a 60 jours</span>
        <span>Aujourd'hui</span>
      </div>
    </div>
  )
}
