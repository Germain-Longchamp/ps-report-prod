import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  Settings, 
  ChevronRight, 
  ExternalLink,
  ImageIcon,
  ShieldCheck,
  Activity,
  Globe,
  Search as SearchIcon,
  Loader2,
  AlertOctagon, 
  CheckCircle2
} from 'lucide-react'
import { PageList } from '@/components/PageList'
import { RunAuditButton } from '@/components/RunAuditButton'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: folder } = await supabase
    .from('folders')
    .select(`
        *, 
        pages (
            *,
            audits (
                id, created_at, status_code, ttfb,
                performance_score, performance_desktop_score,
                seo_score, best_practices_score, accessibility_score
            )
        )
    `)
    .eq('id', id)
    .single()

  if (!folder) redirect('/')

  const pages = folder.pages || []

  // --- 1. VÉRIFICATION LIVE DU ROOT URL ---
  // On ne dépend pas de la DB, on teste le site "maintenant"
  let liveStatus = 0
  try {
    // On ajoute un timeout court (2s) pour ne pas bloquer le chargement de la page si le site est down
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    
    // On s'assure que l'URL a un protocole
    const targetUrl = folder.root_url.startsWith('http') ? folder.root_url : `https://${folder.root_url}`
    
    const res = await fetch(targetUrl, { 
        method: 'HEAD', // Juste les headers, pas le corps (plus rapide)
        cache: 'no-store', // Pas de cache, on veut l'état actuel
        signal: controller.signal
    })
    clearTimeout(timeoutId)
    liveStatus = res.status
  } catch (e) {
    liveStatus = 0 // Erreur réseau, Timeout, DNS => Site DOWN
  }

  // Est-ce que le site est en ligne ? (Code 2xx ou 3xx)
  const isSiteUp = liveStatus >= 200 && liveStatus < 400

  // --- 2. RÉCUPÉRATION DES DONNÉES HISTORIQUES (Pour SEO/SSL) ---
  // On garde quand même la logique d'audit pour les autres infos si dispo
  const allAudits = pages.flatMap((p: any) => p.audits || [])
  const lastGlobalAudit = allAudits.sort((a: any, b: any) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0]

  // Pour le SSL, si le fetch a marché en HTTPS, c'est valide. Sinon on regarde l'URL.
  const isSSLValid = folder.root_url.startsWith('https') && liveStatus !== 0
  const isIndexable = lastGlobalAudit ? (lastGlobalAudit.seo_score || 0) > 50 : true

  return (
    <div className="relative min-h-screen bg-gray-50/30">
      <div className="p-10 w-full max-w-7xl mx-auto space-y-12 pb-32">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex gap-6">
                <div className="h-20 w-20 shrink-0 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden relative flex items-center justify-center p-1">
                    <div className="bg-gray-50 h-full w-full rounded-xl flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-300" />
                    </div>
                </div>
                <div className="space-y-3">
                    <nav className="flex items-center gap-1 text-sm text-muted-foreground font-medium">
                        <Link href="/" className="hover:text-gray-900 transition-colors">Mes Sites</Link>
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                        <span className="text-gray-900">{folder.name}</span>
                    </nav>
                    <div className="flex flex-col gap-2">
                         <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
                            {folder.name}
                        </h1>
                        <a href={folder.root_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors w-fit group">
                            <Globe className="h-3.5 w-3.5" />
                            {folder.root_url}
                            <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </a>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                  <Link href={`/settings`}>
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
                        <Settings className="h-4 w-4 mr-2" />
                        Paramètres
                    </Button>
                  </Link>
            </div>
        </header>

        {/* KPI CARDS */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Santé du site</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* --- CARTE STATUS (Basée sur le Live Check) --- */}
              <Card className={`border-0 shadow-sm flex flex-col justify-between p-6 h-full relative overflow-hidden transition-all duration-300
                  ${isSiteUp ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-red-600 text-white shadow-red-200'}
              `}>
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                  
                  <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                            État du service
                          </span>
                          
                          <div className="text-2xl font-bold flex items-center gap-2">
                             {isSiteUp ? (
                                <>Opérationnel <CheckCircle2 className="h-6 w-6" /></>
                             ) : (
                                <>Hors Ligne <AlertOctagon className="h-6 w-6" /></>
                             )}
                          </div>
                      </div>

                      {/* Indicateur visuel */}
                      <div className="relative flex h-3 w-3 mt-1.5">
                          {isSiteUp ? (
                            <>
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                            </>
                          ) : (
                            // Pas de ping si c'est down, juste le point rouge (ou blanc fixe sur fond rouge)
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white animate-pulse"></span>
                          )}
                      </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm font-medium opacity-90">
                      <Activity className="h-4 w-4" />
                      <span className="font-mono">
                         CODE {liveStatus === 0 ? 'ERR' : liveStatus}
                      </span>
                  </div>
              </Card>

              {/* Carte SSL */}
              <Card className="border-gray-200 shadow-sm flex flex-col justify-center p-6 h-full hover:border-gray-300 transition-colors bg-white">
                  <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${isSSLValid ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                          <ShieldCheck className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold text-gray-600">Sécurité SSL</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900 truncate">{isSSLValid ? "Sécurisé" : "Non sécurisé"}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isSSLValid ? 'Certificat valide détecté' : 'Problème de certificat ou site inaccessible'}
                  </p>
              </Card>

              {/* Carte Indexation */}
              <Card className="border-gray-200 shadow-sm flex flex-col justify-center p-6 h-full hover:border-gray-300 transition-colors bg-white">
                  <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${isIndexable ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'}`}>
                          <SearchIcon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold text-gray-600">Indexation</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">{isIndexable ? "Indexable" : "Bloqué"}</div>
                  <p className="text-xs text-muted-foreground mt-1">Visible par les moteurs</p>
              </Card>
          </div>
        </section>

        {/* SECTION PAGES + FORMULAIRE */}
        <section className="space-y-6 pt-2">
            <div>
                 <h2 className="text-xl font-bold text-gray-900">Pages internes</h2>
                 <p className="text-sm text-gray-500 mt-1">Monitoring individuel des pages clés.</p>
            </div>
            {/* On passe bien le rootUrl pour l'autocomplétion */}
            <PageList initialPages={pages} folderId={folder.id} rootUrl={folder.root_url} />
        </section>

      </div>
      <RunAuditButton folderId={folder.id} />
    </div>
  )
}