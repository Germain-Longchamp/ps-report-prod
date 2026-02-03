'use client'

import { useState } from 'react'
import { 
  Search, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2,
  Calendar,
  ArrowUpDown
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Certificate {
  id: string
  name: string
  url: string
  httpsValid: boolean
  expiryDate: string | null
  daysLeft: number | null
}

export function SSLCertificateTable({ initialCertificates }: { initialCertificates: Certificate[] }) {
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // --- FILTRAGE & TRI ---
  const filteredCerts = initialCertificates
    .filter(cert => 
      cert.name.toLowerCase().includes(search.toLowerCase()) || 
      cert.url.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      // Tri par jours restants (les plus urgents en premier par défaut)
      const daysA = a.daysLeft ?? 9999
      const daysB = b.daysLeft ?? 9999
      return sortOrder === 'asc' ? daysA - daysB : daysB - daysA
    })

  // --- HELPERS VISUELS ---
  const getStatusInfo = (cert: Certificate) => {
    if (!cert.httpsValid) return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle, label: 'Invalide' }
    if (cert.daysLeft === null) return { color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', icon: ShieldCheck, label: 'Inconnu' }
    
    if (cert.daysLeft < 0) return { color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200', icon: XCircle, label: 'Expiré' }
    if (cert.daysLeft < 15) return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle, label: 'Critique' }
    if (cert.daysLeft < 30) return { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: AlertTriangle, label: 'À renouveler' }
    
    return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2, label: 'Valide' }
  }

  const toggleSort = () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <CardTitle>État du parc</CardTitle>
                <CardDescription>Vue d'ensemble de tous les certificats.</CardDescription>
            </div>
            <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input 
                    placeholder="Filtrer par nom ou url..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                />
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-3 font-medium">Site Web</th>
                        <th className="px-6 py-3 font-medium">État SSL</th>
                        <th className="px-6 py-3 font-medium">
                            <button onClick={toggleSort} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
                                Expiration
                                <ArrowUpDown className="h-3 w-3" />
                            </button>
                        </th>
                        <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredCerts.length > 0 ? (
                        filteredCerts.map((cert) => {
                            const status = getStatusInfo(cert)
                            const Icon = status.icon

                            return (
                                <tr key={cert.id} className="bg-white hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900">{cert.name}</span>
                                            <a href={cert.url} target="_blank" className="text-xs text-gray-500 hover:text-blue-600 truncate max-w-[200px] flex items-center gap-1 mt-0.5">
                                                {cert.url}
                                            </a>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="outline" className={cn("flex w-fit items-center gap-1.5 px-2.5 py-0.5 shadow-none font-medium", status.bg, status.color, status.border)}>
                                            <Icon className="h-3.5 w-3.5" />
                                            {status.label}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 font-medium">
                                                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                                {cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : '--'}
                                            </div>
                                            {cert.daysLeft !== null && (
                                                <span className={cn("text-xs mt-0.5", status.color)}>
                                                    {cert.daysLeft > 0 ? `Dans ${cert.daysLeft} jours` : `Expiré depuis ${Math.abs(cert.daysLeft)} jours`}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button variant="ghost" size="sm" asChild className="text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                                            <a href={cert.url} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-4 w-4" />
                                                <span className="sr-only">Voir le site</span>
                                            </a>
                                        </Button>
                                    </td>
                                </tr>
                            )
                        })
                    ) : (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500 bg-gray-50/20 border-dashed">
                                Aucun certificat trouvé pour "{search}"
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </CardContent>
    </Card>
  )
}
