import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, User, Key, Save } from 'lucide-react'
import { updateProfile, updateOrgSettings } from '@/app/actions'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()

  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Récupération des Données
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  let org = null
  if (member) {
    const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', member.organization_id)
        .single()
    org = orgData
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
                Paramètres <span className="text-gray-400">&</span> <span className="text-zinc-900">Configuration</span>
            </h1>
            <p className="text-gray-500 mt-2 text-lg max-w-2xl">
                Gérez vos informations personnelles et les connexions aux services tiers.
            </p>
        </div>
      </div>

      {/* CONTENU */}
      <div className="grid gap-8 md:grid-cols-2">
        
        {/* 1. CARTE PROFIL */}
        <Card className="border-gray-200 shadow-sm">
            <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <User className="h-5 w-5" />
                    </div>
                    <CardTitle>Mon Profil</CardTitle>
                </div>
                <CardDescription>
                    Vos informations personnelles d'identification.
                </CardDescription>
            </CardHeader>
            <form action={updateProfile}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email (Non modifiable)</Label>
                        <Input 
                            id="email" 
                            value={user.email} 
                            disabled 
                            className="bg-gray-50 text-gray-500" 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">Prénom</Label>
                            <Input 
                                id="firstName" 
                                name="firstName" 
                                defaultValue={profile?.first_name || ''} 
                                placeholder="Jean"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Nom</Label>
                            <Input 
                                id="lastName" 
                                name="lastName" 
                                defaultValue={profile?.last_name || ''} 
                                placeholder="Dupont"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-gray-50/50 border-t border-gray-100 p-4 flex justify-end">
                    {/* AJOUT DE 'text-white' ICI */}
                    <Button type="submit" size="sm" className="bg-black text-white hover:bg-gray-800">
                        <Save className="h-4 w-4 mr-2" />
                        Enregistrer le profil
                    </Button>
                </CardFooter>
            </form>
        </Card>

        {/* 2. CARTE API GOOGLE */}
        <Card className="border-gray-200 shadow-sm">
            <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                        <Key className="h-5 w-5" />
                    </div>
                    <CardTitle>PageSpeed Insights API</CardTitle>
                </div>
                <CardDescription>
                    Nécessaire pour lancer les audits de performance.
                </CardDescription>
            </CardHeader>
            
            {org ? (
                <form action={updateOrgSettings}>
                    <input type="hidden" name="orgId" value={org.id} />
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="apiKey">Clé API Google</Label>
                            <div className="relative">
                                <Input 
                                    id="apiKey" 
                                    name="apiKey" 
                                    type="password"
                                    defaultValue={org.google_api_key || ''} 
                                    placeholder="AIzaSy..." 
                                    className="pr-10 font-mono text-sm"
                                />
                                <div className="absolute right-3 top-2.5 text-gray-400">
                                    <Key className="h-4 w-4" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Cette clé est stockée de manière sécurisée.
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-gray-50/50 border-t border-gray-100 p-4 flex justify-end">
                        {/* AJOUT DE 'text-white' ICI AUSSI */}
                        <Button type="submit" size="sm" className="bg-black text-white hover:bg-gray-800">
                            <Save className="h-4 w-4 mr-2" />
                            Sauvegarder la clé
                        </Button>
                    </CardFooter>
                </form>
            ) : (
                <CardContent className="py-10 text-center text-gray-500">
                    <p>Aucune organisation trouvée.</p>
                </CardContent>
            )}
        </Card>

      </div>
    </div>
  )
}