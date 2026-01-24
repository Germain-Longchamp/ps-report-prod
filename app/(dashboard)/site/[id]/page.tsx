import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Plus, 
  Globe, 
  ShieldCheck, 
  Activity, 
  ImageIcon, 
  Settings, 
  ChevronRight, 
  ExternalLink,
  Search as SearchIcon,
  Trash2
} from 'lucide-react'
import { PageList } from '@/components/PageList'
import { RunAuditButton } from '@/components/RunAuditButton'
import { createPage } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  // 1. Correctif Next.js 15
  const { id } = await params
  
  const supabase = await createClient()

  // 2. Auth & Data
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: folder } = await supabase
    .from('folders')
    .select(`
        *, 
        pages (
            *,
            audits (
                id, created_at, status_code, 
                performance_score, performance_desktop_score,
                seo_score, best_practices_score, accessibility_score
            )
        )
    `)
    .eq('id', id)
    .single()

  if (!folder) redirect('/')

  // Récupérer le dernier audit GLOBAL (Racine) s'il existe dans la liste des pages
  // Note: Souvent la "racine" est une page comme les autres, ou alors on prend le dernier audit de n'importe quelle page pour l'exemple
  const pages = folder.pages || []
  
  // Simulation des données KPI basées sur le dossier (ou le dernier audit de la première page trouvée)
  // Idéalement, vous devriez avoir un audit spécifique pour la racine stocké quelque part, ou utiliser le premier de la liste.
  const lastMainAudit = pages.length > 0 && pages[0].audits?.length > 0 
    ? pages[0].audits[0] // On prend le plus récent de la première page comme "témoin"
    : null;

  const isUp = lastMainAudit ? lastMainAudit.status_code < 400 : true // Par défaut true si pas d'audit
  const isSSLValid = folder.root_url.startsWith('https')
  const isIndexable = lastMainAudit ? (lastMainAudit.seo_score || 0) > 50 : true // Simulation

  return (
    <div className="relative min-h-screen bg-gray-50/30">
      <div className="p-10 w-full max-w-7xl mx-auto space-y-12 pb-32">
        
        {/* --- 1. HEADER RESTAURÉ --- */}
        <header className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            
            <div className="flex gap-6">
                {/* Miniature (Style "App Icon") */}
                <div className="h-20 w-20 shrink-0 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden relative flex items-center justify-center p-1">
                    {/* Placeholder car on n'a pas encore le champ screenshot dans la DB */}
                    <div className="bg-gray-50 h-full w-full rounded-xl flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-300" />
                    </div>
                </div>

                {/* Textes & Breadcrumbs */}
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
            
            {/* Actions (Paramètres, Supprimer) */}
            <div className="flex items-center gap-2">
                  <Link href={`/settings`}>
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
                        <Settings className="h-4 w-4 mr-2" />
                        Paramètres
                    </Button>
                  </Link>
            </div>
        </header>

        {/* --- 2. KPI CARDS (RESTAURÉES & MODERNISÉES) --- */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Santé du site</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Carte Status (Animée) */}
              <Card className={`border-0 shadow-sm flex flex-col justify-between p-6 h-full relative overflow-hidden transition-all ${isUp ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                  <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                          <span className={`text-xs font-semibold uppercase tracking-wider ${isUp ? 'text-emerald-100' : 'text-red-100'}`}>État du service</span>
                          <div className="text-2xl font-bold flex items-center gap-2">{isUp ? "Opérationnel" : "Erreur Critique"}</div>
                      </div>
                      <div className="relative flex h-3 w-3 mt-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                      </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm opacity-90 font-medium">
                      <Activity className="h-4 w-4" />
                      <span className="font-mono">HTTP {lastMainAudit?.status_code || '200'}</span>
                  </div>
              </Card>

              {/* Carte HTTPS */}
              <Card className="border-gray-200 shadow-sm flex flex-col justify-center p-6 h-full hover:border-gray-300 transition-colors bg-white">
                  <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${isSSLValid ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                          <ShieldCheck className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold text-gray-600">Sécurité SSL</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900 truncate">{isSSLValid ? "Sécurisé" : "Non sécurisé"}</div>
                  <p className="text-xs text-muted-foreground mt-1">Certificat valide détecté</p>
              </Card>

              {/* Carte Indexable */}
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

        {/* --- 3. LISTE DES PAGES (HYBRIDE) --- */}
        <section className="space-y-6 pt-2">
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-200 pb-4 gap-4">
              <div>
                  <h2 className="text-xl font-bold text-gray-900">Pages internes</h2>
                  <p className="text-sm text-gray-500 mt-1">Monitoring individuel des pages clés.</p>
              </div>
              
              {/* Bouton Ajout (Via Dialog) */}
              <Dialog>
                <DialogTrigger asChild>
                    <Button className="bg-black text-white hover:bg-zinc-800 shadow-sm">
                        <Plus className="h-4 w-4 mr-2" /> Suivre une nouvelle URL
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajouter une sous-page</DialogTitle>
                        <DialogDescription>
                            Entrez l'URL complète de la page à surveiller.
                        </DialogDescription>
                    </DialogHeader>
                    <form action={createPage} className="space-y-4 py-4">
                        <input type="hidden" name="folderId" value={folder.id} />
                        <div className="space-y-2">
                            <Label htmlFor="name">Nom (Optionnel)</Label>
                            <Input id="name" name="name" placeholder="Ex: Page Tarifs" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="url">URL Complète</Label>
                            <Input id="url" name="url" placeholder={`Ex: ${folder.root_url}/pricing`} required type="url" />
                        </div>
                        <Button type="submit" className="w-full bg-black text-white">Ajouter et Analyser</Button>
                    </form>
                </DialogContent>
            </Dialog>
            </div>

            {/* Utilisation de votre composant PageList qui contient le tri et les filtres */}
            <PageList initialPages={pages} folderId={folder.id} />

        </section>

      </div>

      {/* BOUTON D'AUDIT FLOTTANT */}
      <RunAuditButton folderId={folder.id} />

    </div>
  )
}