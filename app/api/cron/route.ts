import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
// Importe ta logique d'audit ici (si tu l'as extraite dans un fichier lib)
// ou réécris la logique simplifiée ici.

export async function GET(request: Request) {
  // 1. SÉCURITÉ : Vérifier que c'est bien Vercel qui appelle
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = await createClient()

  // 2. Récupérer tous les sites à auditer
  const { data: folders } = await supabase
    .from('folders')
    .select('id, root_url')
  
  if (!folders || folders.length === 0) {
      return NextResponse.json({ message: 'Aucun site à auditer' });
  }

  // 3. Boucler sur les sites (Attention au Timeout Vercel !)
  // Note : Sur le plan gratuit, la fonction coupe après 10 à 60 secondes.
  // Pour une V1 avec peu de sites, ça passe. Pour une V2, il faudra une "Queue".
  
  const results = []
  
  for (const folder of folders) {
      try {
          // ICI : Appelle ta fonction d'audit (celle qui fait le fetch Google PageSpeed)
          // Exemple fictif : 
          // const auditResult = await runAuditFunction(folder.root_url)
          // await saveAuditToDb(auditResult)
          
          console.log(`Audit lancé pour ${folder.root_url}`)
          results.push({ site: folder.root_url, status: 'launched' })
      } catch (e) {
          console.error(`Erreur sur ${folder.root_url}`, e)
      }
  }

  return NextResponse.json({ 
      success: true, 
      processed: results.length 
  });
}