import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Trash2, ShieldCheck, Search, Globe, Plus, Activity, ImageIcon, Settings, ChevronRight, ExternalLink } from 'lucide-react'
import { createPage } from '@/app/actions'
import { RunAuditButton } from '@/components/RunAuditButton'
import { PageRow } from '@/components/PageRow'
import { SubmitButton } from '@/components/SubmitButton'
import { SiteHeaderActions } from '@/components/SiteHeaderActions'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SiteDetailsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Auth & Data
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: folder } = await supabase
    .from('folders')
    .select('*')
    .eq('id', id)
    .single()

  if (!folder) notFound()

  const { data: pages } = await supabase
    .from('pages')
    .select('*')
    .eq('folder_id', id)
    .order('created_at', { ascending: true })

  const { data: allAudits } = await supabase
    .from('audits')
    .select('*')
    .eq('folder_id', id)
    .order('created_at', { ascending: false })

  const lastMainAudit = allAudits?.find(a => a.page_id === null) || null;
  const getLastAuditForPage = (pageId: string) => allAudits?.find(a => a.page_id === pageId) || null

  return (
    <div className="relative min-h-screen bg-gray-50/30">
      <div className="p-10 w-full max-w-6xl mx-auto space-y-12 pb-32">
        
        {/* --- 1. HEADER MODERNE (Sans bordure, aéré) --- */}
        <header className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            
            <div className="flex gap-6">
                {/* A. Miniature (Style "App Icon") */}
                <div className="h-20 w-20 shrink-0 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden relative flex items-center justify-center p-1">
                    {lastMainAudit?.screenshot ? (
                        <img 
                            src={lastMainAudit.screenshot} 
                            alt="Aperçu site" 
                            className="h-full w-full object-cover object-top rounded-xl"
                        />
                    ) : (
                        <div className="bg-gray-50 h-full w-full rounded-xl flex items-center justify-center">
                             <ImageIcon className="h-8 w-8 text-gray-300" />
                        </div>
                    )}
                </div>

                {/* B. Textes & Breadcrumbs */}
                <div className="space-y-3">
                    {/* Fil d'ariane subtil */}
                    <nav className="flex items-center gap-1 text-sm text-muted-foreground font-medium">
                        <Link href="/" className="hover:text-gray-900 transition-colors">Mes Sites</Link>
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                        <span className="text-gray-900">{folder.name}</span>
                    </nav>

                    <div className="flex flex-col gap-2">
                         <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
                            {folder.name}
                        </h1>
                        
                        {/* URL Badge (Style Pastille) */}
                        <a 
                            href={folder.root_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors w-fit group"
                        >
                            <Globe className="h-3.5 w-3.5" />
                            {folder.root_url}
                            <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </a>
                    </div>
                </div>
            </div>
            
            {/* C. Actions (Discrètes) */}
            <SiteHeaderActions folder={folder} />
        </header>

        {/* --- 2. VUE GÉNÉRAL --- */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Santé du site</h2>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Vue racine</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Carte Status */}
              {(() => {
                  const isUp = lastMainAudit?.status_code === 200
                  return (
                      <Card className={`border-0 shadow-sm flex flex-col justify-between p-6 h-full relative overflow-hidden transition-all ${isUp ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                          <div className="flex items-start justify-between">
                              <div className="flex flex-col gap-1">
                                  <span className={`text-xs font-semibold uppercase tracking-wider ${isUp ? 'text-emerald-100' : 'text-red-100'}`}>Disponibilité</span>
                                  <div className="text-2xl font-bold flex items-center gap-2">{isUp ? "En Ligne" : "Hors Ligne"}</div>
                              </div>
                              <div className="relative flex h-3 w-3 mt-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                              </div>
                          </div>
                          <div className="mt-4 flex items-center gap-2 text-sm opacity-90 font-medium">
                              <Activity className="h-4 w-4" />
                              <span>HTTP {lastMainAudit?.status_code || '---'}</span>
                          </div>
                      </Card>
                  )
              })()}

              {/* Carte HTTPS */}
              <Card className="border-gray-200 shadow-sm flex flex-col justify-center p-6 h-full hover:border-gray-300 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${lastMainAudit?.https_valid ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                          <ShieldCheck className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold text-gray-600">Sécurité SSL</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900 truncate">{lastMainAudit?.https_valid ? "Sécurisé" : "Non sécurisé"}</div>
                  <p className="text-xs text-muted-foreground mt-1">Certificat valide détecté</p>
              </Card>

              {/* Carte Indexable */}
              <Card className="border-gray-200 shadow-sm flex flex-col justify-center p-6 h-full hover:border-gray-300 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${lastMainAudit?.indexable ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'}`}>
                          <Search className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold text-gray-600">Indexation</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">{lastMainAudit?.indexable ? "Indexable" : "Bloqué"}</div>
                  <p className="text-xs text-muted-foreground mt-1">Visible par les moteurs</p>
              </Card>
          </div>
        </section>

        {/* --- 3. BLOC LISTE DES PAGES --- */}
        <section className="space-y-6 pt-2">
           <div className="flex items-end justify-between border-b border-gray-200 pb-4">
              <div>
                  <h2 className="text-xl font-bold text-gray-900">Pages internes</h2>
                  <p className="text-sm text-gray-500 mt-1">Monitoring individuel des pages clés.</p>
              </div>
              {/* Optionnel : Compteur de pages */}
              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                {pages?.length || 0} URL(s)
              </span>
           </div>
           
           <div className="grid gap-6">
                {/* Bloc Ajout */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="p-1 bg-black text-white rounded">
                            <Plus className="h-3 w-3" />
                        </div>
                        Suivre une nouvelle URL
                    </h3>
                    <form action={createPage} className="flex flex-col md:flex-row gap-3 items-end">
                        <input type="hidden" name="folderId" value={id} />
                        
                        <div className="w-full md:w-1/3 space-y-1.5">
                            <label htmlFor="name" className="text-xs font-semibold text-gray-500 ml-1">Nom (ex: Tarifs)</label>
                            <Input id="name" name="name" placeholder="Nom de la page..." className="bg-gray-50 border-gray-200 focus:bg-white transition-all" />
                        </div>
                        
                        <div className="w-full md:flex-1 space-y-1.5">
                            <label htmlFor="url" className="text-xs font-semibold text-gray-500 ml-1">URL Complète</label>
                            <Input id="url" name="url" placeholder="https://..." required className="bg-gray-50 border-gray-200 focus:bg-white transition-all" />
                        </div>

                        <SubmitButton />
                    </form>
                </div>

                {/* Liste des Pages */}
                <div className="space-y-3">
                    {pages && pages.length > 0 ? (
                        pages.map((page) => (
                            <PageRow key={page.id} page={page} folderId={id} lastAudit={getLastAuditForPage(page.id)} />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            <Globe className="h-10 w-10 text-gray-300 mb-3" />
                            <p className="text-gray-500 font-medium">Aucune page interne surveillée.</p>
                            <p className="text-xs text-gray-400 max-w-xs mt-1">Ajoutez des pages spécifiques (Blog, Pricing, Contact) pour analyser leur performance.</p>
                        </div>
                    )}
                </div>
           </div>
        </section>

      </div>

      <RunAuditButton folderId={folder.id} />
    </div>
  )
}