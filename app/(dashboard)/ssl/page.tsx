import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { SSLCertificateList } from '@/components/SSLCertificateList'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

function getDaysRemaining(dateString: string | null) {
  if (!dateString) return null
  const now = new Date()
  const expiry = new Date(dateString)
  const diffTime = expiry.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export default async function SSLPage() {
  const supabase = await createClient()

  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // --- LOGIQUE MULTI-TENANT ---
  // A. Récupérer les organisations valides
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)

  const validOrgIds = memberships?.map(m => m.organization_id) || []

  // B. Récupérer l'organisation active
  const cookieStore = await cookies()
  let activeOrgId = Number(cookieStore.get('active_org_id')?.value)

  if (!activeOrgId || !validOrgIds.includes(activeOrgId)) {
      activeOrgId = validOrgIds[0]
  }

  // 2. Data Fetching (FILTRÉ PAR ORG)
  const { data: folders } = await supabase
    .from('folders')
    .select('*, audits(ssl_expiry_date, https_valid, created_at)')
    .eq('organization_id', activeOrgId) // <--- FILTRE ICI
    .order('created_at', { ascending: false })

  // 3. Transformation des données
  const certificates = (folders || []).map((folder: any) => {
    // Dernier audit le plus récent
    const lastAudit = (folder.audits || []).sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

    // Si pas d'audit, on retourne null pour filtrer
    if (!lastAudit) return null

    return {
      id: folder.id,
      name: folder.name,
      url: folder.root_url,
      httpsValid: lastAudit.https_valid,
      expiryDate: lastAudit.ssl_expiry_date,
      daysLeft: getDaysRemaining(lastAudit.ssl_expiry_date)
    }
  }).filter(Boolean) as any[] // On retire les nulls

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      
      {/* HEADER */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
            Suivi des <span className="text-blue-600">Certificats SSL</span>
        </h1>
        <p className="text-gray-500 mt-2 text-lg max-w-2xl">
            Visualisez les dates d'expiration de vos certificats HTTPS pour anticiper les renouvellements.
        </p>
      </div>

      {/* COMPOSANT CLIENT (Recherche + Liste) */}
      {certificates.length > 0 ? (
          <SSLCertificateList initialCertificates={certificates} />
      ) : (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/30 text-center">
              <ShieldCheck className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Aucun certificat suivi</h3>
              <p className="text-gray-500 mt-1">Ajoutez des sites pour voir apparaître leurs dates d'expiration ici.</p>
          </div>
      )}

    </div>
  )
}