import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, ExternalLink, ShieldCheck, Search, Globe, Plus, Settings } from 'lucide-react'
import { createPage, deletePage } from '@/app/actions' // Assure-toi d'avoir ajouté ces exports

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SiteDetailsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Auth & Data Fetching
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Récupérer le dossier (Site racine)
  const { data: folder } = await supabase
    .from('folders')
    .select('*')
    .eq('id', id)
    .single()

  if (!folder) notFound()

  // Récupérer les sous-pages associées
  const { data: pages } = await supabase
    .from('pages')
    .select('*')
    .eq('folder_id', id)
    .order('created_at', { ascending: true })

  // Récupérer le dernier audit pour le bloc Général (Placeholder logic)
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
                <Button>Lancer une analyse</Button>
            </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        
        {/* --- 2. BLOC GÉNÉRAL (Gauche - 2 colonnes) --- */}
        <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Vue d'ensemble</h2>
            
            <div className="grid gap-6 md:grid-cols-2">
                {/* Screenshot Card */}
                <Card className="overflow-hidden md:col-span-2 border-gray-200 shadow-sm">
                    <CardHeader className="bg-gray-50 border-b border-gray-100 py-3">
                        <CardTitle className="text-sm font-medium text-gray-500">Aperçu du site</CardTitle>
                    </CardHeader>
                    <div className="aspect-video bg-gray-100 relative flex items-center justify-center">
                        {lastAudit?.screenshot ? (
                            <img src={lastAudit.screenshot} alt="Screenshot" className="object-cover w-full h-full" />
                        ) : (
                            <span className="text-gray-400 text-sm">Aucun aperçu disponible</span>
                        )}
                    </div>
                </Card>

                {/* Status Cards */}
                <Card className="border-gray-200 shadow-sm">
                   <CardContent className="pt-6 flex items-center gap-4">
                        <div className={`p-3 rounded-full ${lastAudit?.status_code === 200 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                            <Globe className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-500">Code Statut</div>
                            <div className="text-2xl font-bold text-gray-900">{lastAudit?.status_code || '---'}</div>
                        </div>
                   </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-sm">
                   <CardContent className="pt-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm text-gray-600">
                                <ShieldCheck className="h-4 w-4" /> HTTPS
                            </span>
                            {lastAudit?.https_valid ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Sécurisé</Badge>
                            ) : (
                                <Badge variant="outline" className="text-gray-400">Inconnu</Badge>
                            )}
                        </div>
                         <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm text-gray-600">
                                <Search className="h-4 w-4" /> Indexable
                            </span>
                             {lastAudit?.indexable ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Oui</Badge>
                            ) : (
                                <Badge variant="outline" className="text-gray-400">Inconnu</Badge>
                            )}
                        </div>
                   </CardContent>
                </Card>
            </div>
        </div>

        {/* --- 3. BLOC LISTE DES PAGES (Droite - 1 colonne) --- */}
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Pages suivies</h2>
            
            <Card className="border-gray-200 shadow-sm h-full">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-500">Ajouter une page</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Formulaire d'ajout simple */}
                    <form action={createPage} className="flex gap-2">
                        <input type="hidden" name="folderId" value={id} />
                        <Input 
                            name="url" 
                            placeholder="https://..." 
                            required 
                            className="bg-gray-50"
                        />
                        <Button type="submit" size="icon" variant="secondary">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </form>

                    {/* Liste des pages */}
                    <div className="space-y-2 mt-4">
                        {pages && pages.length > 0 ? (
                            pages.map((page) => (
                                <div key={page.id} className="group flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white hover:border-gray-300 transition-all">
                                    <div className="truncate text-sm font-medium text-gray-700 max-w-[200px]" title={page.url}>
                                        {page.url}
                                    </div>
                                    <form action={async () => {
                                        'use server'
                                        await deletePage(page.id, id)
                                    }}>
                                        <button type="submit" className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </form>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400 text-xs">
                                Aucune page additionnelle.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  )
}