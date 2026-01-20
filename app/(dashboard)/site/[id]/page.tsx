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

            {/* CARTE 2 : STATUS */}
            <Card className="border-gray-200 shadow-sm flex flex-col justify-center p-6 h-full">
                <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-full ${lastAudit?.status_code === 200 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        <Activity className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Réponse</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                    {lastAudit?.status_code || '---'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Code HTTP standard</p>
            </Card>

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
      <section className="space-y-4 pt-4 border-t border-gray-100">
         <div className="flex items-center justify-between">
            <div>
                <h2 className="text-xl font-semibold text-gray-900">Pages internes</h2>
                <p className="text-sm text-gray-500">Ajoutez d'autres URLs de ce site à surveiller.</p>
            </div>
         </div>
         
         <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-6 space-y-6">
                
                {/* Formulaire d'ajout */}
                <form action={createPage} className="flex gap-4 items-end">
                    <input type="hidden" name="folderId" value={id} />
                    <div className="flex-1 space-y-2">
                        <span className="text-xs font-medium text-gray-700 ml-1">Nouvelle URL</span>
                        <Input 
                            name="url" 
                            placeholder="https://mon-site.com/tarifs" 
                            required 
                            className="bg-gray-50"
                        />
                    </div>
                    <Button type="submit" variant="secondary">
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter
                    </Button>
                </form>

                {/* Liste des pages */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pages && pages.length > 0 ? (
                        pages.map((page) => (
                            <div key={page.id} className="group relative flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-gray-50 rounded-md text-gray-400">
                                        <Globe className="h-4 w-4" />
                                    </div>
                                    <div className="truncate text-sm font-medium text-gray-700" title={page.url}>
                                        {page.url}
                                    </div>
                                </div>
                                <form action={async () => {
                                    'use server'
                                    await deletePage(page.id, id)
                                }}>
                                    <button type="submit" className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </form>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-8 text-center text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed">
                            Aucune page configurée.
                        </div>
                    )}
                </div>
            </CardContent>
         </Card>
      </section>

    </div>
  )
}