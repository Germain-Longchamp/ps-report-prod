import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
// ON REMPLACE L'ANCIEN IMPORT PAR LE NOUVEAU TABLEAU
import { SSLCertificateTable } from '@/components/SSLCertificateTable'
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
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)

  const validOrgIds = memberships?.map(m => m.organization_id) || []

  const cookieStore = await cookies()
  let activeOrgId = Number(cookieStore.get('active_org_id')?.value)

  if (!activeOrgId || !validOrgIds.includes(activeOrgId)) {
      activeOrgId = validOrgIds[0]
  }

  // 2. Data Fetching
  const { data: folders } = await supabase
    .from('folders')
    .select('*, audits(ssl_expiry_date, https_valid, created_at)')
    .eq('organization_id', activeOrgId)
    .order('created_at', { ascending: false })

  // 3. Transformation des données
  const certificates = (folders || []).map((folder: any) => {
    const lastAudit = (folder.audits || []).sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

    if (!lastAudit) return null

    return {
      id: folder.id,
      name: folder.name,
      url: folder.root_url,
      httpsValid: lastAudit.https_valid,
      expiryDate: lastAudit.ssl_expiry_date,
      daysLeft: getDaysRemaining(lastAudit.ssl_expiry_date)
    }
  }).filter(Boolean) as any[]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
            Certificats SSL
        </h1>
        <p className="text-gray-500 text-lg">
            Suivez la validité et l'expiration de vos certificats HTTPS.
        </p>
      </div>

      {/* TABLEAU */}
      {certificates.length > 0 ? (
          <SSLCertificateTable initialCertificates={certificates} />
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
