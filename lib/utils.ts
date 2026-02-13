import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type DailyStatus = {
  date: string
  status: 'up' | 'down' | 'empty'
  code?: number
}

export function generate60DayHistory(audits: any[]): DailyStatus[] {
  const history: DailyStatus[] = []
  const today = new Date()
  
  const auditMap = new Map<string, any>()
  if (audits) {
      audits.forEach(a => {
          const dateKey = new Date(a.created_at).toISOString().split('T')[0]
          // On garde le dernier audit du jour
          if (!auditMap.has(dateKey)) {
              auditMap.set(dateKey, a)
          }
      })
  }

  for (let i = 59; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      const dateKey = d.toISOString().split('T')[0]
      
      const audit = auditMap.get(dateKey)

      if (audit) {
          const isUp = audit.status_code >= 200 && audit.status_code < 400
          history.push({
              date: dateStr,
              status: isUp ? 'up' : 'down',
              code: audit.status_code
          })
      } else {
          history.push({
              date: dateStr,
              status: 'empty'
          })
      }
  }
  return history
}
