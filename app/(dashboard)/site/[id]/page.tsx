import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { PageList } from '@/components/PageList' // <--- Import du nouveau composant
import { RunAuditButton } from '@/components/RunAuditButton'
import { createPage } from '@/app/actions'
import { Button } from '@/components/ui/button'
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

export default async function SiteDetailsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Data Fetching (Site + Pages + Audits)
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
    .eq('id', params.id)
    .single()

  if (!folder) redirect('/')

  // On trie les audits au niveau data pour que l'état initial soit propre
  // Mais le composant PageList refera son propre tri
  const pages = folder.pages || []

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-24">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-black transition-colors mb-2">
                <ArrowLeft className="h-3 w-3 mr-1" /> Retour
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{folder.name}</h1>
            <a href={folder.root_url} target="_blank" className="text-sm text-blue-600 hover:underline font-mono">
                {folder.root_url}
            </a>
        </div>

        {/* Bouton Ajout Page (Resté côté serveur ou client, peu importe, ici simple dialog) */}
        <Dialog>
            <DialogTrigger asChild>
                <Button className="bg-black hover:bg-zinc-800 text-white shadow-lg">
                    <Plus className="h-4 w-4 mr-2" /> Ajouter une URL
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
                        <Label>Nom (Optionnel)</Label>
                        <Input name="name" placeholder="Ex: Page Contact" />
                    </div>
                    <div className="space-y-2">
                        <Label>URL Complète</Label>
                        <Input name="url" placeholder={`Ex: ${folder.root_url}/contact`} required />
                    </div>
                    <Button type="submit" className="w-full bg-black text-white">Ajouter et Analyser</Button>
                </form>
            </DialogContent>
        </Dialog>
      </div>

      {/* LISTE INTELLIGENTE (CLIENT COMPONENT) */}
      <PageList initialPages={pages} folderId={folder.id} />

      {/* Bouton flottant d'audit global */}
      <RunAuditButton folderId={folder.id} />

    </div>
  )
}