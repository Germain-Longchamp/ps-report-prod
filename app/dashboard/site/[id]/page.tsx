import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// 1. Définition du type pour les paramètres (ID du site)
interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SiteDetailsPage({ params }: PageProps) {
  // 2. On récupère l'ID depuis l'URL
  const { id } = await params

  // 3. Connexion à la base de données
  const supabase = await createClient()
  
  // Vérification de sécurité : l'utilisateur est-il connecté ?
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 4. On va chercher les infos du site correspondant à l'ID
  const { data: folder, error } = await supabase
    .from('folders')
    .select('*')
    .eq('id', id)
    .single()

  // Si le site n'existe pas, on affiche une erreur 404
  if (error || !folder) {
    notFound()
  }

  // 5. L'affichage de la page
  return (
    <div className="p-8 space-y-6">
      {/* En-tête avec bouton retour */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
             <Link href="/" className="hover:text-primary transition-colors">
               ← Retour au tableau de bord
             </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{folder.name}</h1>
          <a 
            href={folder.root_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline text-sm font-medium"
          >
            {folder.root_url}
          </a>
        </div>
        
        <Button variant="outline">Paramètres</Button>
      </div>

      {/* Cartes de statistiques (contenu temporaire) */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">Statut</div>
          <div className="text-2xl font-bold mt-2">Unknown 🤷‍♂️</div>
          <p className="text-xs text-muted-foreground mt-1">Ping non implémenté</p>
        </div>
        
        <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
           <div className="text-sm font-medium text-muted-foreground">Dernier Audit</div>
           <div className="text-2xl font-bold mt-2">Jamais</div>
        </div>
      </div>
    </div>
  )
}