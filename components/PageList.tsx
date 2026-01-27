'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Smartphone, 
  Monitor, 
  Search as SearchIcon, 
  ExternalLink,
  Trash2,
  MoreVertical,
  Play,       
  FileText,   
  Timer,
  Loader2,
  Accessibility,
  CalendarDays,
  AlertTriangle,
  ArrowUpNarrowWide,
  Plus,
  CornerDownRight,
  Layers,
  AlertCircle,
  FileQuestion,
  X
} from 'lucide-react'
import { deletePage, runPageSpeedAudit, getAuditDetails, createPagesBulk } from '@/app/actions'
import { toast } from "sonner"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils' 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AuditDetails } from '@/components/AuditDetails'

// --- TYPES ---
interface Audit {
  id: string
  created_at: string
  status_code: number
  ttfb: number | null
  performance_score: number | null
  performance_desktop_score: number | null
  seo_score: number | null
  best_practices_score: number | null
  accessibility_score: number | null
}

interface Page {
  id: string
  name: string
  url: string
  created_at: string
  audits: Audit[]
  isOptimistic?: boolean 
}

// Pour le formulaire d'ajout multiple
interface NewPageRow {
    id: string
    name: string
    url: string
}

// --- HELPERS ---
const getScoreColor = (score: number | null) => {
  if (score === null) return 'text-gray-400 bg-gray-50 border-gray-200'
  if (score >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  if (score >= 50) return 'text-orange-600 bg-orange-50 border-orange-200'
  return 'text-red-600 bg-red-50 border-red-200'
}

const getTtfbColor = (ms: number | null) => {
    if (!ms) return 'text-gray-400'
    if (ms < 200) return 'text-emerald-600'
    if (ms < 800) return 'text-orange-600'
    return 'text-red-600'
}

const getLastAuditSafe = (audits: Audit[] | null) => {
  if (!audits || audits.length === 0) return null
  return [...audits].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
}

export function PageList({ initialPages, folderId, rootUrl }: { initialPages: any[], folderId: string, rootUrl: string }) {
  const router = useRouter()
  const [pages, setPages] = useState<Page[]>(initialPages)
  
  useEffect(() => {
    setPages(initialPages)
  }, [initialPages])

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [runningAuditId, setRunningAuditId] = useState<string | null>(null)
  
  // UI States
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedAuditReport, setSelectedAuditReport] = useState<any>(null)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [pageToDelete, setPageToDelete] = useState<string | null>(null)

  // --- NOUVEAU : GESTION MULTI-LIGNES ---
  const [rows, setRows] = useState<NewPageRow[]>([{ id: '1', name: '', url: '' }])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddRow = () => {
    setRows(prev => [...prev, { id: Math.random().toString(), name: '', url: '' }])
  }

  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) {
        setRows([{ id: '1', name: '', url: '' }]) // Reset si c'est la dernière
        return
    }
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const handleRowChange = (id: string, field: 'name' | 'url', value: string) => {
    setRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row))
  }

  // --- STATS CALCULÉES ---
  const totalPages = pages.length
  const errorPages = pages.filter(p => {
      const lastAudit = getLastAuditSafe(p.audits)
      return lastAudit && lastAudit.status_code >= 400
  }).length

  // --- ACTIONS ---

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 1. Filtrer les lignes vides
    const validRows = rows.filter(r => r.url.trim() !== '')
    if (validRows.length === 0) return

    // 2. Préparer les données
    setIsSubmitting(true)
    const pagesToSubmit = validRows.map(row => {
        let finalUrl = row.url.trim()
        if (!finalUrl.startsWith('http')) {
            if (finalUrl.startsWith('/')) {
                 finalUrl = rootUrl.replace(/\/$/, '') + finalUrl
            } else {
                 finalUrl = `https://${finalUrl}`
            }
        }
        return {
            name: row.name.trim() || finalUrl,
            url: finalUrl
        }
    })

    // 3. OPTIMISTIC UI : On ajoute tout de suite à la liste et ON VIDE le formulaire
    const tempPages: Page[] = pagesToSubmit.map((p, index) => ({
        id: `temp-${Date.now()}-${index}`,
        name: p.name,
        url: p.url,
        created_at: new Date().toISOString(),
        audits: [],
        isOptimistic: true
    }))

    setPages(prev => [...tempPages, ...prev])
    setRows([{ id: Math.random().toString(), name: '', url: '' }]) // On reset le form direct !
    setIsSubmitting(false) // On libère le bouton direct !

    // 4. Appel Serveur (En tâche de fond pour l'UI)
    try {
        const formData = new FormData()
        formData.append('folderId', folderId)
        formData.append('pagesJson', JSON.stringify(pagesToSubmit))

        await createPagesBulk(formData)
        
        toast.success(`${pagesToSubmit.length} page(s) ajoutée(s) et en cours d'analyse !`)
        router.refresh()
    } catch (error) {
        toast.error("Une erreur est survenue lors de l'ajout.")
        // On retire les optimistics en cas d'erreur (optionnel, ou on laisse router.refresh gérer)
        setPages(prev => prev.filter(p => !p.isOptimistic))
    }
  }

  const confirmDelete = async () => {
    if (!pageToDelete) return
    const res = await deletePage(pageToDelete, folderId)
    setPageToDelete(null)
    if (res.error) toast.error(res.error)
    else {
        toast.success("Page supprimée")
        setPages(prev => prev.filter(p => p.id !== pageToDelete)) 
        router.refresh()
    }
  }

  const handleRunAudit = async (url: string, pageId: string) => {
    setRunningAuditId(pageId)
    toast.info("Audit lancé...")
    const res = await runPageSpeedAudit(url, folderId, pageId)
    setRunningAuditId(null)
    if (res.error) toast.error(res.error)
    else {
        toast.success("Audit terminé !")
        router.refresh()
    }
  }

  const handleViewReport = async (auditId: string) => {
      setIsSheetOpen(true)
      setIsLoadingReport(true)
      setSelectedAuditReport(null) 
      const res = await getAuditDetails(auditId)
      setIsLoadingReport(false)
      if (res.error || !res.report) {
          toast.error("Impossible de charger le rapport détaillé.")
          setIsSheetOpen(false)
      } else {
          setSelectedAuditReport(res.report)
      }
  }

  // --- FILTRAGE ET TRI ---
  const filteredPages = pages
    .filter((page: Page) => 
        page.name?.toLowerCase().includes(search.toLowerCase()) || 
        page.url?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a: Page, b: Page) => {
      if (a.isOptimistic) return -1
      if (b.isOptimistic) return 1

      const auditA = getLastAuditSafe(a.audits)
      const auditB = getLastAuditSafe(b.audits)
      
      if (!auditA && !auditB) return 0
      if (!auditA) return 1
      if (!auditB) return -1

      switch (sortBy) {
        case 'mobile': return (auditA.performance_score || 0) - (auditB.performance_score || 0)
        case 'desktop': return (auditA.performance_desktop_score || 0) - (auditB.performance_desktop_score || 0)
        case 'seo': return (auditA.seo_score || 0) - (auditB.seo_score || 0)
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  return (
    <>
    <div className="space-y-6">
      
      {/* 1. ZONE D'AJOUT RAPIDE (BATCH) */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
         <div className="flex items-center justify-between">
             <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <div className="p-1 bg-black text-white rounded">
                    <Plus className="h-3.5 w-3.5" />
                </div>
                Ajouter des pages
             </div>
             
             <div className="flex items-center gap-2">
                 <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-mono text-xs">
                     {totalPages} Pages
                 </Badge>
                 {errorPages > 0 && (
                     <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-200 font-mono text-xs">
                         {errorPages} Erreur{errorPages > 1 ? 's' : ''}
                     </Badge>
                 )}
             </div>
         </div>
         
         <form onSubmit={handleBulkSubmit} className="space-y-3">
             {rows.map((row, index) => (
                 <div key={row.id} className="flex flex-col md:flex-row gap-3 items-start md:items-center animate-in slide-in-from-left-2 duration-300">
                     <div className="w-full md:w-1/3">
                        <Input 
                            placeholder="Nom (Optionnel)" 
                            className="bg-gray-50 border-gray-200 focus:bg-white h-9"
                            value={row.name}
                            onChange={(e) => handleRowChange(row.id, 'name', e.target.value)}
                        />
                     </div>
                     <div className="w-full md:flex-1 relative">
                        <Input 
                            placeholder={index === 0 ? "URL (ex: /contact)" : "Autre URL..."}
                            className="bg-gray-50 border-gray-200 focus:bg-white h-9"
                            value={row.url}
                            onChange={(e) => handleRowChange(row.id, 'url', e.target.value)}
                        />
                     </div>
                     
                     {/* Bouton supprimer la ligne (sauf si c'est la seule et qu'elle est vide) */}
                     <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                        onClick={() => handleRemoveRow(row.id)}
                        disabled={rows.length === 1 && !row.url}
                     >
                        <X className="h-4 w-4" />
                     </Button>
                 </div>
             ))}

             <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
                 <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleAddRow}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 text-xs font-medium"
                 >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Ajouter une ligne
                 </Button>

                 <Button 
                    type="submit" 
                    size="sm"
                    disabled={isSubmitting || rows.every(r => !r.url)} 
                    className="bg-black text-white hover:bg-zinc-800 h-9 px-4"
                 >
                    {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <CornerDownRight className="h-3.5 w-3.5 mr-2" />}
                    {rows.filter(r => r.url).length > 1 ? "Tout ajouter" : "Ajouter"}
                 </Button>
             </div>
         </form>
      </div>

      {/* 2. BARRE D'OUTILS ET DE TRI (Inchangée) */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm xl:items-center">
        <div className="relative w-full xl:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input 
                type="text" 
                placeholder="Chercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
            />
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 no-scrollbar">
            <span className="text-sm text-gray-500 whitespace-nowrap hidden xl:block font-medium">Trier par :</span>
            <div className="flex gap-2">
                <button onClick={() => setSortBy('date')} className={cn("flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full transition-all border", sortBy === 'date' ? "bg-black text-white border-black shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50")}>
                    <CalendarDays className="h-3.5 w-3.5" /> Récents
                </button>
                <button onClick={() => setSortBy('mobile')} className={cn("flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full transition-all border", sortBy === 'mobile' ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-blue-200 hover:text-blue-600")}>
                    <Smartphone className="h-3.5 w-3.5" /> Mobile {sortBy === 'mobile' && <ArrowUpNarrowWide className="h-3 w-3 ml-1 opacity-70"/>}
                </button>
                <button onClick={() => setSortBy('desktop')} className={cn("flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full transition-all border", sortBy === 'desktop' ? "bg-slate-700 text-white border-slate-700 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-slate-300 hover:text-slate-800")}>
                    <Monitor className="h-3.5 w-3.5" /> Desktop {sortBy === 'desktop' && <ArrowUpNarrowWide className="h-3 w-3 ml-1 opacity-70"/>}
                </button>
                <button onClick={() => setSortBy('seo')} className={cn("flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full transition-all border", sortBy === 'seo' ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-emerald-200 hover:text-emerald-600")}>
                    <SearchIcon className="h-3.5 w-3.5" /> SEO {sortBy === 'seo' && <ArrowUpNarrowWide className="h-3 w-3 ml-1 opacity-70"/>}
                </button>
            </div>
        </div>
      </div>

      {/* 3. LISTE DES RÉSULTATS (Avec état vide) */}
      <div className="space-y-3">
        {filteredPages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 bg-white border border-dashed border-gray-200 rounded-xl text-center">
                <div className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <FileQuestion className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Aucune page trouvée</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                    {search ? "Essayez de modifier votre recherche." : "Commencez par ajouter une URL ci-dessus."}
                </p>
            </div>
        )}

        {filteredPages.map((page: Page) => {
            if (page.isOptimistic) {
                return (
                    <div key={page.id} className="bg-blue-50/50 rounded-xl border border-blue-100 p-4 flex items-center gap-6 animate-pulse">
                         <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-gray-900 truncate">{page.name}</h3>
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 animate-pulse">
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Mise en file d'attente...
                                </Badge>
                            </div>
                            <div className="text-xs text-gray-500 truncate">{page.url}</div>
                        </div>
                        <div className="text-sm text-gray-400 italic pr-4 hidden sm:block">Analyse bientôt lancée...</div>
                    </div>
                )
            }

            const lastAudit = getLastAuditSafe(page.audits)
            const hasAudit = !!lastAudit
            const isError = hasAudit && lastAudit!.status_code >= 400
            const isRunning = runningAuditId === page.id

            return (
                <div key={page.id} className={cn(
                    "group rounded-xl border shadow-sm hover:shadow-md transition-all p-4 flex flex-col md:flex-row md:items-center gap-6",
                    isError 
                        ? "bg-red-50/40 border-red-200 hover:border-red-300 hover:bg-red-50" 
                        : "bg-white border-gray-200 hover:border-gray-300"
                )}>
                    {/* ... (LE RESTE DU RENDU DE LA CARTE EST IDENTIQUE À VOTRE CODE ACTUEL) ... */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900 truncate">{page.name}</h3>
                            {isError && (
                                <Badge variant="outline" className="bg-white text-red-600 border-red-200 hover:bg-red-50 h-5 px-1.5 text-[10px] ml-1 shadow-sm font-mono">
                                    Erreur {lastAudit!.status_code}
                                </Badge>
                            )}
                        </div>
                        <a href={page.url} target="_blank" className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 truncate transition-colors">
                            {page.url} <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>

                    {hasAudit && !isError ? (
                        <div className="flex items-center gap-2 md:gap-6 shrink-0 overflow-x-auto pb-2 md:pb-0">
                            <div className="flex flex-col items-center min-w-[60px]">
                                <span className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1"><Monitor className="h-3 w-3" /> Desk</span>
                                <div className={`text-sm font-bold px-2 py-0.5 rounded border ${getScoreColor(lastAudit!.performance_desktop_score)}`}>{lastAudit!.performance_desktop_score ?? '-'}</div>
                            </div>
                            <div className="flex flex-col items-center min-w-[60px]">
                                <span className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1"><Smartphone className="h-3 w-3" /> Mob</span>
                                <div className={`text-sm font-bold px-2 py-0.5 rounded border ${getScoreColor(lastAudit!.performance_score)}`}>{lastAudit!.performance_score ?? '-'}</div>
                            </div>
                            <div className="flex flex-col items-center min-w-[60px]">
                                <span className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1"><SearchIcon className="h-3 w-3" /> SEO</span>
                                <div className={`text-sm font-bold px-2 py-0.5 rounded border ${getScoreColor(lastAudit!.seo_score)}`}>{lastAudit!.seo_score ?? '-'}</div>
                            </div>
                            <div className="flex flex-col items-center min-w-[60px]">
                                <span className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1"><Accessibility className="h-3 w-3" /> Access</span>
                                <div className={`text-sm font-bold px-2 py-0.5 rounded border ${getScoreColor(lastAudit!.accessibility_score)}`}>{lastAudit!.accessibility_score ?? '-'}</div>
                            </div>
                            <div className="flex flex-col items-center min-w-[60px] border-l border-gray-100 pl-4 ml-2">
                                <span className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1"><Timer className="h-3 w-3" /> TTFB</span>
                                <div className={`text-sm font-bold ${getTtfbColor(lastAudit!.ttfb)}`}>{lastAudit!.ttfb ? `${lastAudit!.ttfb}ms` : '-'}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="shrink-0 text-sm text-gray-400 italic px-4">
                            {isError ? "Audit impossible" : "En attente d'analyse..."}
                        </div>
                    )}

                    <div className="shrink-0 flex items-center gap-2 pl-2 md:border-l md:border-gray-100 md:pl-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-black hover:bg-gray-100" onClick={() => handleRunAudit(page.url, page.id)} disabled={isRunning} title="Relancer l'audit">
                            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        </Button>
                        {hasAudit && !isError && (
                             <Button variant="outline" size="sm" className="h-8 text-blue-600 border-blue-200 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-300" onClick={() => handleViewReport(lastAudit!.id)}>
                                <FileText className="h-3.5 w-3.5 mr-2" /> Rapport
                            </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-black"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white">
                                <DropdownMenuItem onClick={() => setPageToDelete(page.id)} className="text-red-600 cursor-pointer focus:text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            )
        })}
      </div>
    </div>

    {/* SIDE PANEL & DIALOG (Inchangés) */}
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto p-0 bg-white">
            <SheetHeader className="p-6 pb-2 border-b border-gray-100">
                <SheetTitle>Rapport Détaillé</SheetTitle>
                <SheetDescription>Analyse technique approfondie de la page.</SheetDescription>
            </SheetHeader>
            <div className="h-full">
                {isLoadingReport ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <Loader2 className="h-8 w-8 text-black animate-spin" />
                        <p className="text-sm text-gray-500">Chargement du rapport complet...</p>
                    </div>
                ) : selectedAuditReport ? (
                    <AuditDetails report={selectedAuditReport} />
                ) : (
                    <div className="p-8 text-center text-gray-500">Aucune donnée disponible.</div>
                )}
            </div>
        </SheetContent>
    </Sheet>

    <AlertDialog open={!!pageToDelete} onOpenChange={(open) => !open && setPageToDelete(null)}>
        <AlertDialogContent className="bg-white">
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Supprimer cette page ?
                </AlertDialogTitle>
                <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white border-0">
                    Supprimer définitivement
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  )
}