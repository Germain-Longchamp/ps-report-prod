import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// 1. Import du composant Toaster (vérifie bien le chemin selon ton installation)
import { Toaster } from "@/components/ui/sonner"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PS Report",
  description: "Monitoring de performance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {children}
        
        {/* --- C'EST ICI QU'IL FAUT LE METTRE --- */}
        <Toaster 
            position="top-center" // Pour l'avoir bien en vue en haut
            richColors // INDISPENSABLE pour avoir le fond vert/rouge
            closeButton // Ajoute une petite croix pour fermer
        />
        
      </body>
    </html>
  );
}