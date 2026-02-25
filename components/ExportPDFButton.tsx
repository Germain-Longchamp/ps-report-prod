'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ExportPDFButtonProps {
    siteName: string
    siteUrl: string
    globalScore: number | null
    isSSLValid: boolean
    isIndexable: boolean
    incidentCount: number
    pages: any[]
}

export function ExportPDFButton({
    siteName,
    siteUrl,
    globalScore,
    isSSLValid,
    isIndexable,
    incidentCount,
    pages
}: ExportPDFButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false)

    const handleExport = () => {
        setIsGenerating(true)

        try {
            const doc = new jsPDF()
            const today = new Date().toLocaleDateString('fr-FR')

            // --- 1. EN-TÊTE DU DOCUMENT ---
            doc.setFontSize(22)
            doc.setTextColor(15, 23, 42) // text-gray-900
            doc.text(`Rapport d'Audit : ${siteName}`, 14, 20)

            doc.setFontSize(10)
            doc.setTextColor(100, 116, 139) // text-gray-500
            doc.text(`URL : ${siteUrl}`, 14, 28)
            doc.text(`Date du rapport : ${today}`, 14, 34)

            // Ligne de séparation
            doc.setDrawColor(226, 232, 240)
            doc.line(14, 40, 196, 40)

            // --- 2. RÉSUMÉ DE L'ÉTAT (SNAPSHOT) ---
            doc.setFontSize(14)
            doc.setTextColor(15, 23, 42)
            doc.text('Aperçu de la santé globale', 14, 50)

            doc.setFontSize(11)
            doc.setTextColor(71, 85, 105)
            
            const scoreText = globalScore !== null ? `${globalScore} / 100` : 'En attente'
            doc.text(`• Note globale pondérée : ${scoreText}`, 14, 60)
            doc.text(`• Certificat SSL : ${isSSLValid ? 'Sécurisé (Valide)' : 'Invalide / Expiré'}`, 14, 68)
            doc.text(`• Indexation SEO : ${isIndexable ? 'Optimisé' : 'À revoir'}`, 14, 76)
            doc.text(`• Stabilité (60 derniers jours) : ${incidentCount === 0 ? "Aucun incident détecté" : `${incidentCount} incident(s) détecté(s)`}`, 14, 84)

            // --- 3. PRÉPARATION DES DONNÉES DU TABLEAU ---
            const tableColumn = ["Nom de la page", "Statut", "Perf (M)", "Perf (D)", "SEO", "Access.", "Best P."]
            const tableRows: any[] = []

            pages.forEach(page => {
                const pLastAudit = page.audits?.sort((a: any, b: any) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0]

                tableRows.push([
                    page.name || page.url,
                    pLastAudit?.status_code || '-',
                    pLastAudit?.performance_score ?? '-',
                    pLastAudit?.performance_desktop_score ?? '-',
                    pLastAudit?.seo_score ?? '-',
                    pLastAudit?.accessibility_score ?? '-',
                    pLastAudit?.best_practices_score ?? '-',
                ])
            })

            // --- 4. GÉNÉRATION DU TABLEAU ---
            doc.setFontSize(14)
            doc.setTextColor(15, 23, 42)
            doc.text(`Détail des ${pages.length} pages analysées`, 14, 100)

            autoTable(doc, {
                startY: 105,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [37, 99, 235], textColor: 255 }, // bg-blue-600
                styles: { fontSize: 9, cellPadding: 4 },
                alternateRowStyles: { fillColor: [248, 250, 252] }, // bg-slate-50
            })

            // --- 5. TÉLÉCHARGEMENT ---
            doc.save(`Audit_${siteName.replace(/\s+/g, '_')}_${today.replace(/\//g, '-')}.pdf`)

        } catch (error) {
            console.error("Erreur lors de la génération du PDF", error)
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <Button 
            onClick={handleExport} 
            disabled={isGenerating} 
            variant="outline" 
            className="bg-white border-gray-200 text-gray-700 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm"
        >
            {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
                <FileDown className="h-4 w-4 mr-2" />
            )}
            {isGenerating ? "Création..." : "Générer un PDF"}
        </Button>
    )
}
