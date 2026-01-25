'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, Calendar, ArrowRight, ExternalLink, Lock, Unlock, Search, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

type Certificate = {
  id: string
  name: string
  url: string
  httpsValid: boolean
  expiryDate: string | null
  daysLeft: number | null
}

export function SSLCertificateList({ initialCertificates }: { initialCertificates: Certificate[] }) {
  const [searchTerm, setSearchTerm] = useState('')

  // 1. FILTRAGE
  const filteredCerts = initialCertificates.filter(cert => 
    cert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.url.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 2. TRI AVANCÉ (Déjà fait côté serveur en partie, mais on renforce ici pour le dynamique)
  // Priorité : Invalide > Expiré > Bientôt Expiré > Valide loin
  const sortedCerts = filteredCerts.sort((a, b) => {
      // 1. Les certificats invalides (HTTPS KO) en tout premier
      if (!a.httpsValid && b.httpsValid) return -1
      if (a.httpsValid && !b.httpsValid) return 1

      // 2. Les certificats expirés (daysLeft < 0)
      const aExpired = (a.daysLeft !== null && a.daysLeft < 0)
      const bExpired = (b.daysLeft !== null && b.daysLeft < 0)
      if (aExpired && !bExpired) return -1
      if (!aExpired && bExpired) return 1

      // 3. Les dates inconnues à la fin (ou au début selon préférence, ici à la fin des problèmes)
      if (a.daysLeft === null) return 1
      if (b.daysLeft === null) return -1

      // 4. Tri par date d'expiration croissante (le plus proche en premier)
      return (a.daysLeft || 9999) - (b.daysLeft || 9999)
  })

  return (
    <div className="space-y-6">
        {/* BARRE DE RECHERCHE */}
        <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input 
                placeholder="Rechercher un site..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white border-gray-200 focus:border-blue-500 transition-all"
            />
        </div>

        {/* LISTE */}
        <div className="space-y-4">
            {sortedCerts.length > 0 ? (
                sortedCerts.map((cert) => {
                    // Logique de couleur
                    let statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200"
                    let statusText = "Valide"
                    let iconColor = "text-emerald-600"
                    let sideColor = "bg-emerald-500"
                    
                    if (!cert.httpsValid) {
                        statusColor = "bg-red-50 text-red-700 border-red-200"
                        statusText = "Non sécurisé"
                        iconColor = "text-red-600"
                        sideColor = "bg-red-600"
                    } else if (cert.daysLeft !== null && cert.daysLeft < 0) {
                        statusColor = "bg-red-50 text-red-700 border-red-200"
                        statusText = "Expiré"
                        iconColor = "text-red-600"
                        sideColor = "bg-red-600"
                    } else if (cert.daysLeft !== null && cert.daysLeft < 30) {
                        statusColor = "bg-orange-50 text-orange-700 border-orange-200"
                        statusText = "Expire bientôt"
                        iconColor = "text-orange-600"
                        sideColor = "bg-orange-500"
                    }

                    return (
                        <div 
                            key={cert.id} 
                            className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-1 flex items-stretch"
                        >
                            {/* Indicateur Latéral */}
                            <div className={`w-1.5 rounded-l-lg shrink-0 ${sideColor}`} />

                            <div className="flex-1 flex flex-col md:flex-row md:items-center p-5 gap-6">
                                
                                {/* Icone */}
                                <div className="shrink-0 hidden md:block">
                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${statusColor} bg-opacity-40`}>
                                        {!cert.httpsValid ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                                    </div>
                                </div>

                                {/* Infos */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-lg font-bold text-gray-900 truncate">{cert.name}</h3>
                                        <Badge variant="outline" className={`text-xs font-medium border ${statusColor}`}>
                                            {statusText}
                                        </Badge>
                                    </div>
                                    <a href={cert.url} target="_blank" className="text-sm text-gray-500 flex items-center gap-1 hover:text-blue-600 w-fit transition-colors">
                                        {cert.url}
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>

                                {/* Date & Jours */}
                                <div className="flex flex-col items-end justify-center min-w-[150px]">
                                    {cert.expiryDate ? (
                                        <>
                                            <div className={`text-2xl font-bold ${iconColor} tabular-nums`}>
                                                {cert.daysLeft !== null && cert.daysLeft > 0 ? `${cert.daysLeft} jours` : (cert.daysLeft !== null ? 'Expiré' : '-')}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>{new Date(cert.expiryDate).toLocaleDateString()}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-1 rounded-full text-xs font-medium border border-orange-100">
                                            <AlertTriangle className="h-3 w-3" />
                                            Date inconnue
                                        </div>
                                    )}
                                </div>

                                {/* Action */}
                                <div className="shrink-0 pl-4 border-l border-gray-100 hidden md:block">
                                    <Link href={`/site/${cert.id}`}>
                                        <button className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-black hover:text-white transition-colors">
                                            <ArrowRight className="h-5 w-5" />
                                        </button>
                                    </Link>
                                </div>

                            </div>
                        </div>
                    )
                })
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-gray-500">Aucun certificat ne correspond à votre recherche.</p>
                </div>
            )}
        </div>
    </div>
  )
}