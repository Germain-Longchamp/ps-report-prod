import Link from "next/link"
import { login } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LayoutDashboard } from "lucide-react"

// --- NOUVEAU COMPOSANT SVG TECH ANIMÉ ---
const TechBackgroundSVG = () => (
  <>
    {/* Styles CSS intégrés pour les animations spécifiques */}
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes flowAnimation {
        from { stroke-dashoffset: 1000; }
        to { stroke-dashoffset: 0; }
      }
      @keyframes twinkle {
        0%, 100% { opacity: 0; transform: scale(0.5); }
        50% { opacity: 1; transform: scale(1.5); }
      }
      .flow-line {
        stroke-dasharray: 40 960; /* Un tiret de 40px, un espace de 960px */
        animation: flowAnimation 25s linear infinite; /* Vitesse lente */
      }
      .flow-line-fast {
        stroke-dasharray: 30 500;
        animation: flowAnimation 15s linear infinite;
      }
      .twinkle-dot {
         transform-box: fill-box;
         transform-origin: center;
      }
    `}} />

    <svg
      className="absolute inset-0 h-full w-full stroke-white/20 [mask-image:radial-gradient(120%_120%_at_top_right,white,transparent)]"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="tech-grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
          x="50%"
          y="-1"
          patternTransform="translate(10 10) skewX(15)"
        >
          <path d="M.5 40V.5H40" fill="none" />
        </pattern>
        {/* DÉGRADÉ VIF */}
        <linearGradient id="tech-line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(56, 189, 248, 0.8)" />
          <stop offset="50%" stopColor="rgba(99, 102, 241, 1)" />
          <stop offset="100%" stopColor="rgba(168, 85, 247, 0.8)" />
        </linearGradient>
        {/* DÉGRADÉ POUR LE FLUX (Plus brillant) */}
        <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
           <stop offset="0%" stopColor="#60A5FA" stopOpacity="0" />
           <stop offset="50%" stopColor="#A78BFA" />
           <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Fond quadrillé */}
      <rect width="100%" height="100%" strokeWidth="0" fill="url(#tech-grid)" opacity="0.4" />

      {/* --- COUCHE 1 : Lignes de base statiques (le squelette du réseau) --- */}
      <g className="stroke-2" style={{ stroke: "url(#tech-line-gradient)" }} opacity="0.5">
          <path d="M 0 200 L 400 600 L 800 400 L 1200 800" fill="none" />
          <path d="M 200 0 L 600 400 L 400 800" fill="none" />
          <path d="M 800 0 L 400 400 L 600 1000" fill="none" />
          {/* Quelques lignes horizontales/verticales supplémentaires pour la complexité */}
          <path d="M 0 600 H 1200" opacity="0.2" />
          <path d="M 400 0 V 1000" opacity="0.2" />
      </g>

      {/* --- COUCHE 2 : FLUX DE DONNÉES ANIMÉ (Les "paquets" qui voyagent) --- */}
      {/* Ce sont des copies des lignes du dessus, avec l'animation de pointillés */}
      <g className="stroke-[3px]" style={{ stroke: "url(#flow-gradient)" }} opacity="0.9">
          <path d="M 0 200 L 400 600 L 800 400 L 1200 800" fill="none" className="flow-line" />
          <path d="M 200 0 L 600 400 L 400 800" fill="none" className="flow-line" style={{ animationDelay: '-5s' }} />
          <path d="M 800 0 L 400 400 L 600 1000" fill="none" className="flow-line-fast" />
          {/* Flux horizontal */}
          <path d="M 1200 600 H 0" className="flow-line-fast" opacity="0.5" style={{ animationDuration: '20s' }} />
      </g>
      
      {/* Points lumineux principaux (Existants, légèrement ajustés) */}
      <g fill="rgba(99, 102, 241, 0.9)">
          <circle cx="400" cy="600" r="5" className="animate-[ping_4s_ease-in-out_infinite]" opacity="0.8" />
          <circle cx="600" cy="400" r="4" opacity="0.6" />
          <circle cx="400" cy="400" r="3" className="animate-pulse" />
      </g>

      {/* --- COUCHE 3 : SCINTILLEMENT GRILLE (Nouveaux petits points aléatoires) --- */}
      <g fill="#A78BFA" className="twinkle-dot">
          {/* On place des points sur des intersections de la grille */}
          <circle cx="100" cy="100" r="2" style={{ animation: 'twinkle 4s ease-in-out infinite 1s' }} />
          <circle cx="300" cy="500" r="2" style={{ animation: 'twinkle 6s ease-in-out infinite 0s' }} />
          <circle cx="700" cy="200" r="2" style={{ animation: 'twinkle 5s ease-in-out infinite 2.5s' }} />
          <circle cx="900" cy="600" r="2" style={{ animation: 'twinkle 7s ease-in-out infinite 1s' }} />
          <circle cx="500" cy="800" r="2" style={{ animation: 'twinkle 3s ease-in-out infinite 4s' }} />
          <circle cx="200" cy="700" r="1.5" style={{ animation: 'twinkle 8s ease-in-out infinite 0.5s' }} />
          <circle cx="600" cy="100" r="1.5" style={{ animation: 'twinkle 5.5s ease-in-out infinite 3s' }} />
      </g>
    </svg>
  </>
)


export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2 overflow-hidden">
      
      {/* --- COLONNE GAUCHE (BRANDING + SVG TECH ANIMÉ) --- */}
      <div className="hidden relative bg-zinc-950 lg:flex flex-col justify-between p-10 text-white overflow-hidden z-0">
        
        {/* 1. LE NOUVEAU FOND SVG ANIMÉ */}
        <TechBackgroundSVG />
        
        {/* Dégradé d'ambiance */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-zinc-950/50 to-zinc-950 z-0 pointer-events-none"></div>


        {/* 2. CONTENU AU PREMIER PLAN */}
        <div className="flex items-center gap-3 text-lg font-bold tracking-tight z-10">
          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg shadow-sm shadow-blue-500/20">
             <LayoutDashboard className="h-5 w-5" />
          </div>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-300">
            PS Report
          </span>
        </div>
        
        <div className="z-10 flex-1 flex items-center justify-center">
            {/* Espace vide pour laisser vivre l'animation */}
        </div>

        <div className="text-sm text-zinc-500 z-10 font-medium">
           © 2024 PS Report Inc. <span className="opacity-50">|</span> Monitoring Infrastructure.
        </div>
      </div>

      {/* --- COLONNE DROITE (FORMULAIRE - INCHANGÉ) --- */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white relative z-10">
        <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[380px]">
          
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 leading-tight">
                Connexion
              </span>
            </h1>
            <p className="text-base text-gray-500 mt-2">
              Accédez à votre tableau de bord de monitoring.
            </p>
          </div>

          <div className="grid gap-6">
            <form action={login}>
              <div className="grid gap-5">
                
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    placeholder="nom@exemple.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    required
                    className="bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 transition-all h-11"
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                     <Label htmlFor="password" className="text-gray-700 font-medium">Mot de passe</Label>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 transition-all h-11"
                  />
                </div>
                
                {searchParams?.error === 'true' && (
                    <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg text-center animate-in fade-in slide-in-from-top-2 font-medium">
                        Identifiants incorrects.
                    </div>
                )}

                <Button type="submit" className="h-11 bg-[#0A0A0A] hover:bg-zinc-800 text-white w-full shadow-md transition-all hover:shadow-blue-900/20 text-base font-semibold mt-2">
                  Se connecter
                </Button>

              </div>
            </form>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-gray-400 font-medium tracking-wider">
                  Ou continuer avec
                </span>
              </div>
            </div>
            
            <div className="text-center text-sm text-gray-500">
                Pas encore de compte ?{" "}
                <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors hover:underline underline-offset-4">
                    Créer un compte gratuitement
                </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}