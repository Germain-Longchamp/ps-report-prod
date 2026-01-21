import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Trash2, ShieldCheck, Search, Globe, Plus, Activity, ImageIcon } from 'lucide-react'
import { createPage } from '@/app/actions'
import { RunAuditButton } from '@/components/RunAuditButton'
import { PageRow } from '@/components/PageRow'

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

  // Récupérer le dernier audit GLOBAL (Racine)
  const lastMainAudit = allAudits?.find(a => a.page_id === null) || null;
  const getLastAuditForPage = (pageId: string) => allAudits?.find(a => a.page_id === pageId) || null

  return (
    <div className="relative min-h-screen">
      <div className="p-10 w-full max-w-6xl space-y-10 pb-32">
        
        {/* --- 1. HEADER (Avec Miniature) --- */}
        <div className="flex flex-col gap-6 border-b pb-8">
          <div className="flex items-start justify-between">
              
              {/* Groupe Gauche : Miniature + Textes */}
              <div className="flex items-start gap-6">
                
                {/* Miniature Screenshot */}
                <div className="h-24 w-24 shrink-0 rounded-xl border border-gray-200 bg-gray-100 overflow-hidden relative flex items-center justify-center shadow-sm">
                    {lastMainAudit?.screenshot ? (
                        <img 
                            src={lastMainAudit.screenshot} 
                            alt="Aperçu site" 
                            className="h-full w-full object-cover object-top"
                        />
                    ) : (
                        <ImageIcon className="h-8 w-8 text-gray-300" />
                    )}
                </div>

                {/* Infos Texte */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <Link href="/" className="hover:text-black transition-colors">Mes Sites</Link>
                        <span>/</span>
                        <span>{folder.name}</span>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900">{folder.name}</h1>
                    <a 
                        href={folder.root_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:underline text-lg font-medium"
                    >
                        <Globe className="h-4 w-4" />
                        {folder.root_url}
                    </a>
                </div>
              </div>
              
              {/* Groupe Droite : Actions */}
              <div className="flex gap-3">
                  <Button variant="outline">Paramètres</Button>
                  <Button variant="destructive" size="icon">
                      <Trash2 className="h-4 w-4" />
                  </Button>
              </div>
          </div>
        </div>

        {/* --- 2. VUE GÉNÉRAL (3 Cartes) --- */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Général</h2>
          
          {/* Grille ajustée à 3 colonnes pour remplir l'espace */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Carte Status (Toujours aussi visible) */}
              {(() => {
                  const isUp = lastMainAudit?.status_code === 200
                  return (
                      <Card className={`border-0 shadow-md flex flex-col justify-between p-6 h-full relative overflow-hidden transition-all ${isUp ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                          <div className="flex items-start justify-between">
                              <div className="flex flex-col gap-1">
                                  <span className={`text-xs font-semibold uppercase tracking-wider ${isUp ? 'text-emerald-100' : 'text-red-100'}`}>État du service</span>
                                  <div className="text-2xl font-bold flex items-center gap-2">{isUp ? "Opérationnel" : "Erreur Critique"}</div>
                              </div>
                              <div className="relative flex h-4 w-4 mt-1">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
                              </div>
                          </div>
                          <div className="mt-4 flex items-center gap-2 text-sm opacity-90">
                              <Activity className="h-4 w-4" />
                              <span className="font-mono">Code {lastMainAudit?.status_code || '---'}</span>
                          </div>
                      </Card>
                  )
              })()}

              {/* Carte HTTPS */}
              <Card className="border-gray-200 shadow-sm flex flex-col justify-center p-6 h-full">
                  <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-full ${lastMainAudit?.https_valid ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                          <ShieldCheck className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-medium text-gray-500">Sécurité</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900 truncate">{lastMainAudit?.https_valid ? "Sécurisé (HTTPS)" : "Non sécurisé"}</div>
                  <p className="text-xs text-muted-foreground mt-1">Certificat SSL valide détecté</p>
              </Card>

              {/* Carte Indexable */}
              <Card className="border-gray-200 shadow-sm flex flex-col justify-center p-6 h-full">
                  <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-full ${lastMainAudit?.indexable ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
                          <Search className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-medium text-gray-500">SEO Technique</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">{lastMainAudit?.indexable ? "Indexable" : "Bloqué (noindex)"}</div>
                  <p className="text-xs text-muted-foreground mt-1">Visible par les moteurs de recherche</p>
              </Card>
          </div>
        </section>

        {/* --- 3. BLOC LISTE DES PAGES --- */}
        <section className="space-y-6 pt-6 border-t border-gray-100">
           <div className="flex items-center justify-between">
              <div>
                  <h2 className="text-xl font-semibold text-gray-900">Pages internes</h2>
                  <p className="text-sm text-gray-500">Gérez les URLs spécifiques de ce site.</p>
              </div>
           </div>
           
           <Card className="border-gray-200 shadow-sm bg-gray-50/50">
              <CardContent className="p-6 space-y-8">
                  {/* Formulaire Ajout */}
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-blue-600" /> Ajouter une nouvelle page</h3>
                      <form action={createPage} className="flex flex-col md:flex-row gap-4 items-end">
                          <input type="hidden" name="folderId" value={id} />
                          <div className="w-full md:w-1/3 space-y-2">
                              <label htmlFor="name" className="text-xs font-medium text-gray-700 ml-1">Nom convivial</label>
                              <Input id="name" name="name" placeholder="Ex: Page Tarifs" className="bg-white" />
                          </div>
                          <div className="w-full md:flex-1 space-y-2">
                              <label htmlFor="url" className="text-xs font-medium text-gray-700 ml-1">URL complète</label>
                              <Input id="url" name="url" placeholder="https://mon-site.com/tarifs" required className="bg-white" />
                          </div>
                          <Button type="submit" className="bg-black text-white hover:bg-gray-800">Ajouter</Button>
                      </form>
                  </div>

                  {/* Liste Pages */}
                  <div className="space-y-3">
                      {pages && pages.length > 0 ? (
                          pages.map((page) => (
                              <PageRow key={page.id} page={page} folderId={id} lastAudit={getLastAuditForPage(page.id)} />
                          ))
                      ) : (
                          <div className="text-center py-12 text-gray-400 text-sm">Aucune page configurée.</div>
                      )}
                  </div>
              </CardContent>
           </Card>
        </section>

      </div>

      {/* --- 4. BOUTON FLOTTANT FIXE --- */}
      <RunAuditButton folderId={folder.id} />
      
    </div>
  )
}