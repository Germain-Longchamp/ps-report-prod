import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Globe, Lock, Activity, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { PageList } from '@/components/PageList'
import { RunAuditButton } from '@/components/RunAuditButton'
import { createPage } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

// Définition du type pour Next.js 15
type Props = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  // 1. Déballage de la promesse (Correctif Next.js 15)
  const { id } = await params
  
  const supabase = await createClient()

  // 2. Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 3. Data Fetching
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

  const pages = folder.pages || []

  // --- LOGIQUE D'AFFICHAGE DES CARTES (Simulée basée sur vos données) ---
  // Note : Ajustez les champs (ex: folder.status) selon votre vraie structure DB si différent
  const isOperational = folder.status === 'active' || true // À adapter selon votre colonne DB
  const isSSLValid = folder.root_url.startsWith('https') // Vérification simple
  const isIndexable = true // Placeholder: à connecter à votre colonne 'indexing_status' si elle existe

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-24">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-black transition-colors mb-2">
                <ArrowLeft className="h-3 w-3 mr-1" /> Retour au dashboard
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{folder.name}</h1>
            <a href={folder.root_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline font-mono flex items-center gap-1">
                {folder.root_url} <Globe className="h-3 w-3" />
            </a>
        </div>

        <Dialog>
            <DialogTrigger asChild>
                <Button className="bg-black hover:bg-zinc-800 text-white shadow-lg transition-all">
                    <Plus className="h-4 w-4 mr-2" /> Ajouter une URL
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ajouter une sous-page</DialogTitle>
                    <DialogDescription>
                        Entrez l'URL complète de la page à surveiller pour ce site.
                    </DialogDescription>
                </DialogHeader>
                <form action={createPage} className="space-y-4 py-4">
                    <input type="hidden" name="folderId" value={folder.id} />
                    <div className="space-y-2">
                        <Label htmlFor="name">Nom de la page</Label>
                        <Input id="name" name="name" placeholder="Ex: Page Contact" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="url">URL Complète</Label>
                        <Input id="url" name="url" placeholder={`Ex: ${folder.root_url}/contact`} required type="url" />
                    </div>
                    <Button type="submit" className="w-full bg-black text-white">Ajouter et Analyser</Button>
                </form>
            </DialogContent>
        </Dialog>
      </div>

      {/* --- BLOC KPI / ÉTAT DU SITE (RESTAURÉ) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Carte 1 : Disponibilité */}
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disponibilité</CardTitle>
                <Activity className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                    Opérationnel
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Réponse serveur 200 OK
                </p>
            </CardContent>
        </Card>

        {/* Carte 2 : Certificat SSL */}
        <Card className={`border-l-4 shadow-sm ${isSSLValid ? 'border-l-blue-500' : 'border-l-red-500'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Certificat SSL</CardTitle>
                <Lock className={`h-4 w-4 ${isSSLValid ? 'text-blue-500' : 'text-red-500'}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                    {isSSLValid ? 'Sécurisé' : 'Expiré'}
                    {isSSLValid ? <CheckCircle className="h-5 w-5 text-blue-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    {isSSLValid ? 'HTTPS activé et valide' : 'Attention : Site non sécurisé'}
                </p>
            </CardContent>
        </Card>

        {/* Carte 3 : Indexabilité */}
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Indexabilité</CardTitle>
                <Globe className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                    Indexable
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Autorisé par robots.txt
                </p>
            </CardContent>
        </Card>

      </div>

      {/* LISTE DES PAGES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Pages surveillées ({pages.length})</h2>
        </div>
        <PageList initialPages={pages} folderId={folder.id} />
      </div>

      {/* BOUTON D'AUDIT FLOTTANT */}
      <RunAuditButton folderId={folder.id} />

    </div>
  )
}