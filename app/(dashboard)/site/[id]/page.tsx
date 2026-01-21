import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, ShieldCheck, Search, Globe, Plus, Activity, ImageIcon } from 'lucide-react'
import { createPage, deletePage } from '@/app/actions'
import { RunAuditButton } from '@/components/RunAuditButton'
import { ExternalLink } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SiteDetailsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Auth & Data Fetching
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

  const { data: lastAudit } = await supabase
    .from('audits')
    .select('*')
    .eq('folder_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="p-10 w-full max-w-6xl space-y-10">
      
      {/* --- 1. HEADER --- */}
      <div className="flex flex-col gap-6 border-b pb-8">
        <div className="flex items-start justify-between">
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
            
            <div className="flex gap-3">
                <Button variant="outline">Modifier</Button>
                <Button variant="destructive" size="icon">
                    <Trash2 className="h-4 w-4" />
                </Button>
                <RunAuditButton url={folder.root_url} folderId={folder.id} />
            </div>
        </div>
      </div>

      {/* --- 2. VUE D'ENSEMBLE (GRILLE 4 COLONNES) --- */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Dernier Audit</h2>
        
        {/* Une seule grille pour aligner parfaitement les 4 blocs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* CARTE 1 : APERÇU (S'adapte à la hauteur des autres) */}
            <Card className="overflow-hidden border-gray-200 shadow-sm relative group h-full bg-gray-100 flex items-center justify-center">
                {lastAudit?.screenshot ? (
                    // object-cover + object-top permet de cropper le bas de l'image (souvent moins intéressant)
                    // h-full w-full force l'image à remplir la carte
                    <img 
                        src={lastAudit.screenshot} 
                        alt="Screenshot" 
                        className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" 
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                        <ImageIcon className="h-8 w-8 opacity-50" />
                        <span className="text-xs">Aucun aperçu</span>
                    </div>
                )}
                {/* Petit overlay au survol pour indiquer qu'on peut voir mieux si besoin (optionnel) */}
                {lastAudit?.screenshot && (
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
            </Card>

            {/* CARTE 2 : STATUS (Version "Pop" visuelle) */}
            {(() => {
                const isUp = lastAudit?.status_code === 200
                return (
                    <Card className={`border-0 shadow-md flex flex-col justify-between p-6 h-full relative overflow-hidden transition-all ${
                        isUp 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                        {/* Effet de fond décoratif (cercle subtil) */}
                        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />

                        <div className="flex items-start justify-between">
                            <div className="flex flex-col gap-1">
                                <span className={`text-xs font-semibold uppercase tracking-wider ${isUp ? 'text-emerald-100' : 'text-red-100'}`}>
                                    État du service
                                </span>
                                <div className="text-2xl font-bold flex items-center gap-2">
                                    {isUp ? "Opérationnel" : "Erreur Critique"}
                                </div>
                            </div>
                            
                            {/* Indicateur visuel (Pastille animée) */}
                            <div className="relative flex h-4 w-4 mt-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-sm opacity-90">
                            {isUp ? <Activity className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                            <span className="font-mono">Code {lastAudit?.status_code || '---'}</span>
                        </div>
                    </Card>
                )
            })()}

            {/* CARTE 3 : HTTPS */}
            <Card className="border-gray-200 shadow-sm flex flex-col justify-center p-6 h-full">
                <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-full ${lastAudit?.https_valid ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Sécurité</span>
                </div>
                <div className="text-xl font-bold text-gray-900 truncate">
                    {lastAudit?.https_valid ? "Sécurisé" : "Non sécurisé"}
                </div>
                    <p className="text-xs text-muted-foreground mt-1">Certificat SSL valide</p>
            </Card>

            {/* CARTE 4 : INDEXABLE */}
            <Card className="border-gray-200 shadow-sm flex flex-col justify-center p-6 h-full">
                <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-full ${lastAudit?.indexable ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
                        <Search className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">SEO Tech</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                    {lastAudit?.indexable ? "Indexable" : "Bloqué"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Visible par Google</p>
            </Card>
        </div>
      </section>

      {/* --- 3. BLOC LISTE DES PAGES (En dessous) --- */}
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
                
                {/* A. Formulaire d'ajout (Plus complet) */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <Plus className="h-4 w-4 text-blue-600" />
                        Ajouter une nouvelle page
                    </h3>
                    <form action={createPage} className="flex flex-col md:flex-row gap-4 items-end">
                        <input type="hidden" name="folderId" value={id} />
                        
                        {/* Champ Nom */}
                        <div className="w-full md:w-1/3 space-y-2">
                            <label htmlFor="name" className="text-xs font-medium text-gray-700 ml-1">
                                Nom convivial
                            </label>
                            <Input 
                                id="name"
                                name="name" 
                                placeholder="Ex: Page Tarifs" 
                                className="bg-white"
                            />
                        </div>

                        {/* Champ URL */}
                        <div className="w-full md:flex-1 space-y-2">
                            <label htmlFor="url" className="text-xs font-medium text-gray-700 ml-1">
                                URL complète
                            </label>
                            <Input 
                                id="url"
                                name="url" 
                                placeholder="https://mon-site.com/tarifs" 
                                required 
                                className="bg-white"
                            />
                        </div>

                        <Button type="submit" className="bg-black text-white hover:bg-gray-800">
                            Ajouter
                        </Button>
                    </form>
                </div>

                {/* B. Liste des pages (Empilées Pleine Largeur) */}
                <div className="space-y-3">
                    {pages && pages.length > 0 ? (
                        pages.map((page) => (
                            <div key={page.id} className="group flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:border-blue-200 hover:shadow-md transition-all">
                                
                                {/* Info Page */}
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <Globe className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900">
                                            {page.name || "Page sans nom"}
                                        </div>
                                        <a href={page.url} target="_blank" className="text-sm text-gray-500 hover:text-blue-600 hover:underline flex items-center gap-1 mt-0.5">
                                            {page.url}
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                </div>

                                {/* Actions & KPIs Futurs */}
                                <div className="flex items-center gap-4">
                                    {/* Placeholder pour les scores futurs */}
                                    <div className="hidden md:flex items-center gap-6 mr-4 text-sm text-gray-400">
                                        <span>Perf: --</span>
                                        <span>SEO: --</span>
                                    </div>

                                    <form action={async () => {
                                        'use server'
                                        await deletePage(page.id, id)
                                    }}>
                                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600 hover:bg-red-50">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-gray-400 text-sm">
                            Aucune page configurée. Utilisez le formulaire ci-dessus pour commencer.
                        </div>
                    )}
                </div>

            </CardContent>
         </Card>
      </section>

    </div>
  )
}