import { AlertTriangle, CheckCircle, Clock, FileWarning } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function AuditDetails({ report }: { report: any }) {
  if (!report || !report.lighthouseResult) return <div className="p-4 text-gray-500">Aucune donnée détaillée disponible.</div>

  const lighthouse = report.lighthouseResult
  const audits = lighthouse.audits

  // 1. Filtrer les OPPORTUNITÉS (Gain de temps estimé)
  // On cherche les audits qui ont un 'details.type' = 'opportunity' et un score non parfait
  const opportunities = Object.values(audits).filter((audit: any) => 
    audit.details && 
    audit.details.type === 'opportunity' && 
    audit.score !== null && 
    audit.score < 0.9
  ).sort((a: any, b: any) => (a.score || 0) - (b.score || 0)) // Les pires scores en premier

  // 2. Filtrer les DIAGNOSTICS (Problèmes techniques sans gain de temps direct chiffré)
  const diagnostics = Object.values(audits).filter((audit: any) => 
    audit.details && 
    audit.details.type === 'table' && 
    audit.score !== null && 
    audit.score < 0.9 &&
    !opportunities.includes(audit) // Éviter les doublons
  )

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-8 p-6 pb-20">
        
        {/* En-tête du rapport */}
        <div className="space-y-2">
            <h3 className="font-semibold text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Opportunités d'amélioration
            </h3>
            <p className="text-sm text-gray-500">
                Ces suggestions peuvent aider votre page à charger plus vite.
            </p>
        </div>

        {/* LISTE DES OPPORTUNITÉS */}
        <div className="grid gap-4">
            {opportunities.length > 0 ? (
                opportunities.map((audit: any) => (
                    <div key={audit.id} className="border border-amber-200 bg-amber-50/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start gap-4">
                            <div className="font-semibold text-amber-900 text-sm">
                                {audit.title}
                            </div>
                            {audit.details?.overallSavingsMs > 0 && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 whitespace-nowrap">
                                    - {(audit.details.overallSavingsMs / 1000).toFixed(2)} s
                                </Badge>
                            )}
                        </div>
                        
                        {/* Description propre (on nettoie un peu le markdown basic) */}
                        <div className="text-xs text-gray-600 leading-relaxed">
                            {audit.description.split('[')[0]} {/* Astuce pour couper avant les liens markdown complexes */}
                        </div>

                        {/* Si c'est un tableau de ressources (ex: liste d'images), on l'affiche dans un accordéon */}
                        {audit.details?.items?.length > 0 && (
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="item-1" className="border-none">
                                    <AccordionTrigger className="text-xs text-amber-700 py-1 hover:no-underline">
                                        Voir les {audit.details.items.length} éléments concernés
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="bg-white rounded border border-amber-100 p-2 space-y-1 mt-1">
                                            {audit.details.items.slice(0, 5).map((item: any, i: number) => (
                                                <div key={i} className="text-[10px] text-gray-500 truncate font-mono border-b border-gray-50 last:border-0 pb-1">
                                                    {item.url || item.node?.snippet || "Élément HTML"}
                                                </div>
                                            ))}
                                            {audit.details.items.length > 5 && (
                                                <div className="text-[10px] text-gray-400 italic pt-1">
                                                    ... et {audit.details.items.length - 5} autres.
                                                </div>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        )}
                    </div>
                ))
            ) : (
                <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg text-sm">
                    <CheckCircle className="h-5 w-5" />
                    Aucune opportunité majeure détectée. Bon travail !
                </div>
            )}
        </div>

        <Separator />

        {/* DIAGNOSTICS */}
        <div className="space-y-2">
            <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-gray-600" />
                Diagnostics & Erreurs
            </h3>
            <p className="text-sm text-gray-500">
                Information détaillée sur la configuration de l'application.
            </p>
        </div>

        <div className="grid gap-3">
             {diagnostics.length > 0 ? (
                diagnostics.slice(0, 5).map((audit: any) => (
                    <div key={audit.id} className="flex gap-3 items-start p-3 rounded-lg border border-gray-100 bg-white">
                        <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${audit.score === 0 ? 'bg-red-500' : 'bg-orange-400'}`} />
                        <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900">
                                {audit.title}
                            </div>
                            <p className="text-xs text-gray-500">
                                 {audit.description.split('[')[0]}
                            </p>
                        </div>
                    </div>
                ))
             ) : (
                 <div className="text-sm text-gray-500 italic">Rien à signaler.</div>
             )}
        </div>

      </div>
    </ScrollArea>
  )
}