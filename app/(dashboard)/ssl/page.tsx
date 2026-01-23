import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, Calendar, ArrowRight, ExternalLink, Lock, Unlock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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

  // 2. Récupération des Sites et de leur dernier audit (root)
  const { data: folders } = await supabase
    .from('folders')
    .select('*, audits!inner(ssl_expiry_date, https_valid, created_at)')
    .order('created_at', { ascending: false })

  // 3. Traitement des données
  const certificates = (folders || []).map((folder: any) => {
    // On récupère le dernier audit
    const lastAudit = (folder.audits || []).sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

    if (!lastAudit) return null

    const daysLeft = getDaysRemaining(lastAudit.ssl_expiry_date)
    
    return {
      id: folder.id,
      name: folder.name,
      url: folder.root_url,
      httpsValid: lastAudit.https_valid,
      expiryDate: lastAudit.ssl_expiry_date,
      daysLeft: daysLeft
    }
  })
  // On filtre les nulls (sites sans audit) et on trie par date d'expiration croissante
  .filter(Boolean)
  .sort((a: any, b: any) => {
     // Les expirés ou sans date en premier
     if (a.daysLeft === null) return 1
     if (b.daysLeft === null) return -1
     return a.daysLeft - b.daysLeft
  })

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
                Suivi des <span className="text-blue-600">Certificats SSL</span>
            </h1>
            <p className="text-gray-500 mt-2 text-lg max-w-2xl">
                Visualisez les dates d'expiration de vos certificats HTTPS pour anticiper les renouvellements.
            </p>
        </div>
      </div>

      {/* LISTE */}
      <div className="space-y-4">
        {certificates.length > 0 ? (
            certificates.map((cert: any) => {
                // Logique de couleur
                let statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200"
                let statusText = "Valide"
                let iconColor = "text-emerald-500"
                let ringColor = "bg-emerald-500 ring-emerald-100"
                
                if (!cert.httpsValid) {
                    statusColor = "bg-red-50 text-red-700 border-red-200"
                    statusText = "Invalide / Non sécurisé"
                    iconColor = "text-red-500"
                    ringColor = "bg-red-500 ring-red-100"
                } else if (cert.daysLeft !== null && cert.daysLeft < 0) {
                    statusColor = "bg-red-50 text-red-700 border-red-200"
                    statusText = "Expiré"
                    iconColor = "text-red-500"
                    ringColor = "bg-red-500 ring-red-100"
                } else if (cert.daysLeft !== null && cert.daysLeft < 30) {
                    statusColor = "bg-orange-50 text-orange-700 border-orange-200"
                    statusText = "Expire bientôt"
                    iconColor = "text-orange-500"
                    ringColor = "bg-orange-500 ring-orange-100"
                }

                return (
                    <div 
                        key={cert.id} 
                        className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-1 flex items-stretch"
                    >
                         {/* Indicateur Latéral de couleur */}
                         <div className={`w-1.5 rounded-l-lg shrink-0 ${!cert.httpsValid || (cert.daysLeft < 0) ? 'bg-red-500' : (cert.daysLeft < 30 ? 'bg-orange-400' : 'bg-emerald-500')}`} />

                         <div className="flex-1 flex flex-col md:flex-row md:items-center p-5 gap-6">
                            
                            {/* Icone Lock */}
                            <div className="shrink-0 hidden md:block">
                                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${statusColor} bg-opacity-30`}>
                                    {cert.httpsValid ? <Lock className="h-6 w-6" /> : <Unlock className="h-6 w-6" />}
                                </div>
                            </div>

                            {/* Infos Principales */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-lg font-bold text-gray-900 truncate">{cert.name}</h3>
                                    <Badge variant="outline" className={`text-xs font-normal ${statusColor}`}>
                                        {statusText}
                                    </Badge>
                                </div>
                                <a href={cert.url} target="_blank" className="text-sm text-gray-500 flex items-center gap-1 hover:text-blue-600 w-fit transition-colors">
                                    {cert.url}
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>

                            {/* Date & Jours restants */}
                            <div className="flex flex-col items-end justify-center min-w-[150px]">
                                {cert.expiryDate ? (
                                    <>
                                        <div className={`text-2xl font-bold ${iconColor}`}>
                                            {cert.daysLeft > 0 ? `${cert.daysLeft} jours` : 'Expiré'}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>Valide jusqu'au {new Date(cert.expiryDate).toLocaleDateString()}</span>
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-sm text-gray-400 italic">Date inconnue</span>
                                )}
                            </div>

                            {/* Action */}
                            <div className="shrink-0 pl-4 border-l border-gray-100">
                                <Link href={`/site/${cert.id}`}>
                                    <button className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                        <ArrowRight className="h-5 w-5" />
                                    </button>
                                </Link>
                            </div>

                         </div>
                    </div>
                )
            })
        ) : (
            <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/30 text-center">
                <ShieldCheck className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Aucun certificat suivi</h3>
                <p className="text-gray-500 mt-1">Ajoutez des sites pour voir apparaître leurs dates d'expiration ici.</p>
            </div>
        )}
      </div>

    </div>
  )
}