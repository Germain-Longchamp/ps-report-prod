import { login, signup } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LayoutDashboard } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 px-4 py-8 bg-white shadow-lg rounded-xl border border-gray-100">
        
        {/* En-tête */}
        <div className="text-center">
          <div className="mx-auto bg-blue-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <LayoutDashboard className="text-white h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Bienvenue sur Studio Hub</h2>
          <p className="mt-2 text-sm text-gray-600">
            Connectez-vous pour accéder à vos rapports de performance.
          </p>
        </div>

        {/* Formulaire */}
        <form className="mt-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse Email</Label>
              <Input id="email" name="email" type="email" placeholder="votre@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" name="password" type="password" required />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* formaction permet de dire à Next.js quelle fonction lancer */}
            <Button formAction={login} className="w-full bg-blue-600 hover:bg-blue-700">
              Se connecter
            </Button>
            <Button formAction={signup} variant="outline" className="w-full">
              Créer un compte
            </Button>
          </div>
        </form>

      </div>
    </div>
  )
}