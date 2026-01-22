import { Image as ImageIcon, ArrowRight, Save, CheckCircle, FileWarning, Zap, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

// Liste des IDs spécifiques aux images pour forcer leur détection
const HEAVY_IMAGE_AUDITS = [
  'image-delivery-insight',
  'uses-optimized-images',
  'modern-image-formats',
  'responsive-images',
  'offscreen-images',
  'unsized-images',
  'uses-responsive-images',
  'efficient-animated-content',
  'duplicated-javascript', 
  'legacy-javascript' 
]

const formatBytes = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'Ko', 'Mo', 'Go']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function AuditDetails({ report }: { report: any }) {
  if (!report || !report.lighthouseResult) return <div className="p-4 text-gray-500">Aucune donnée détaillée disponible.</div>

  const audits = report.lighthouseResult.audits

  // --- 1. FILTRAGE SÉCURISÉ DES IMAGES ---
  const imageOpportunities = Object.values(audits).filter((audit: any) => {
    // A. Vérifier si c'est lié aux images
    const isImageRelated = 
        HEAVY_IMAGE_AUDITS.includes(audit.id) || 
        audit.group === 'media' || 
        (audit.title && audit.title.toLowerCase().includes('image'));

    // B. Vérifier les économies (SÉCURISÉ)
    const items = audit.details?.items;
    const isArray = Array.isArray(items); // <--- LA CORRECTION EST ICI

    const hasSavings = 
        (audit.details?.overallSavingsBytes > 0) || 
        (isArray && items.some((i: any) => i.wastedBytes > 0));

    // C. Score non parfait
    const isNotPerfect = audit.score !== 1 && audit.score !== null;

    return isImageRelated && hasSavings && isNotPerfect;
  }).sort((a: any, b: any) => (b.details?.overallSavingsBytes || 0) - (a.details?.overallSavingsBytes || 0));


  // --- 2. LE RESTE ---
  const otherOpportunities = Object.values(audits).filter((audit: any) => 
    audit.details?.type === 'opportunity' && 
    audit.score < 0.9 &&
    !imageOpportunities.includes(audit)
  ).sort((a: any, b: any) => (a.score || 0) - (b.score || 0));


  // --- 3. DIAGNOSTICS ---
  const diagnostics = Object.values(audits).filter((audit: any) => 
    audit.details?.type === 'table' && 
    audit.score !== null && 
    audit.score < 0.9 &&
    !imageOpportunities.includes(audit) &&
    !otherOpportunities.includes(audit)
  );

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-8 p-6 pb-20">
        
        {/* === BLOC IMAGES === */}
        {imageOpportunities.length > 0 ? (
            <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-indigo-50 text-indigo-900 rounded-xl border border-indigo-100 shadow-sm">
                    <div className="p-2.5 bg-white rounded-lg shadow-sm text-indigo-600">
                        <ImageIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base">Optimisation des Images</h3>
                        <p className="text-xs text-indigo-700 opacity-80 mt-0.5">
                            Réduisez le poids de ces fichiers pour un chargement immédiat.
                        </p>
                    </div>
                </div>

                <div className="grid gap-4">
                    {imageOpportunities.map((audit: any) => {
                        const totalSaved = audit.details?.overallSavingsBytes || 0;
                        const items = Array.isArray(audit.details?.items) ? audit.details.items : [];

                        return (
                            <div key={audit.id} className="border border-indigo-100 bg-white rounded-xl overflow-hidden shadow-sm transition-all hover:border-indigo-300">
                                
                                <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex justify-between items-start gap-4">
                                    <div>
                                        <div className="font-semibold text-gray-900 text-sm">{audit.title}</div>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{audit.description?.split('[')[0]}</p>
                                    </div>
                                    {totalSaved > 0 && (
                                        <Badge className="bg-indigo-600 text-white border-0 shrink-0 px-3 py-1">
                                            <Save className="h-3 w-3 mr-1" />
                                            - {formatBytes(totalSaved)}
                                        </Badge>
                                    )}
                                </div>

                                {/* Liste des Items (SÉCURISÉE) */}
                                {items.length > 0 && (
                                    <div className="divide-y divide-gray-100">
                                        {items.map((item: any, i: number) => {
                                            const imgUrl = item.url || item.source?.url;
                                            if (!imgUrl) return null; 

                                            const wasted = item.wastedBytes || 0;
                                            const total = item.totalBytes || 0;
                                            
                                            // On affiche si on gagne de la place OU si c'est listé dans un audit global
                                            if (wasted === 0 && totalSaved === 0) return null;

                                            return (
                                                <div key={i} className="flex items-center gap-3 p-3 hover:bg-gray-50">
                                                    <div className="h-10 w-10 shrink-0 bg-gray-100 rounded border border-gray-200 overflow-hidden flex items-center justify-center">
                                                        <img src={imgUrl} alt="asset" className="h-full w-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[11px] font-mono text-gray-600 truncate" title={imgUrl}>
                                                            {imgUrl.split('/').pop()}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] mt-0.5">
                                                            <span className="text-gray-400">{formatBytes(total)}</span>
                                                            {wasted > 0 && (
                                                                <>
                                                                    <ArrowRight className="h-3 w-3 text-gray-300" />
                                                                    <span className="text-green-600 font-bold bg-green-50 px-1 rounded">
                                                                        Optimisé: {formatBytes(total - wasted)}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
                <Separator className="my-6" />
            </div>
        ) : (
            <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg text-sm mb-8">
                <CheckCircle className="h-5 w-5" />
                Vos images semblent optimisées (Aucun gain majeur détecté).
            </div>
        )}

        {/* === BLOC AUTRES === */}
        {otherOpportunities.length > 0 && (
            <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-900">
                    <Zap className="h-5 w-5 text-amber-500" />
                    Autres Optimisations
                </h3>
                <div className="grid gap-3">
                    {otherOpportunities.map((audit: any) => (
                        <div key={audit.id} className="border border-amber-200 bg-amber-50/30 rounded-lg p-4">
                            <div className="flex justify-between items-start gap-4">
                                <div className="font-semibold text-amber-900 text-sm">{audit.title}</div>
                                {audit.details?.overallSavingsMs > 0 && (
                                    <Badge variant="outline" className="bg-white text-amber-800 border-amber-200">
                                        - {(audit.details.overallSavingsMs / 1000).toFixed(2)} s
                                    </Badge>
                                )}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">{audit.description.split('[')[0]}</div>
                        </div>
                    ))}
                </div>
                <Separator className="my-6" />
            </div>
        )}

        {/* === DIAGNOSTICS === */}
        <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-600">
                <FileWarning className="h-5 w-5" />
                Diagnostics Techniques
            </h3>
            <div className="grid gap-2">
                {diagnostics.slice(0, 5).map((audit: any) => (
                    <div key={audit.id} className="flex gap-3 items-start p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                        <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${audit.score === 0 ? 'bg-red-500' : 'bg-orange-400'}`} />
                        <div className="text-sm font-medium text-gray-700">{audit.title}</div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </ScrollArea>
  )
}