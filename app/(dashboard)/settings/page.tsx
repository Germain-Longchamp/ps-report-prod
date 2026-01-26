import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InviteMemberForm } from '@/components/InviteMemberForm'
import { RemoveMemberButton } from '@/components/RemoveMemberButton'
import { DeleteOrgButton } from '@/components/DeleteOrgButton' // <--- IMPORT
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { 
    User, Key, Save, Building2, Mail, 
    Users, Crown, AlertOctagon 
} from 'lucide-react'
import { updateProfile, updateOrgSettings } from '@/app/actions'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()

  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Data Fetching (Profil)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 3. LOGIQUE MULTI-TENANT (Organisation Active)
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

  // 4. Récupérer Org + Membres
  let org = null
  let members: any[] = []
  let currentUserRole = 'member' // Par défaut
  
  if (activeOrgId) {
    const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', activeOrgId)
        .single()
    org = orgData

    const { data: membersData } = await supabase
        .from('organization_members')
        .select('*, profiles(first_name, last_name, email)')
        .eq('organization_id', activeOrgId)
    
    members = membersData || []

    // Trouver le rôle de l'utilisateur connecté
    const currentMember = members.find((m: any) => m.user_id === user.id)
    if (currentMember) currentUserRole = currentMember.role
  }

  const firstInitial = profile?.first_name ? profile.first_name[0].toUpperCase() : (user.email?.[0].toUpperCase() || 'U')
  const lastInitial = profile?.last_name ? profile.last_name[0].toUpperCase() : ''

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col gap-2 pb-2">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Paramètres
            </h1>
            <p className="text-gray-500 text-lg">
                Gérez vos préférences et la configuration de votre espace de travail.
            </p>
        </div>

        {/* TABS */}
        <Tabs defaultValue="profile" className="w-full space-y-8">
          
          <TabsList className="bg-white border border-gray-200 p-1 h-14 rounded-full shadow-sm w-auto inline-flex items-center gap-2">
            <TabsTrigger 
                value="profile"
                className="rounded-full px-6 h-11 text-sm font-medium data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-2 text-gray-600"
            >
                <User className="h-4 w-4" />
                Mon Profil
            </TabsTrigger>
            <TabsTrigger 
                value="organization"
                className="rounded-full px-6 h-11 text-sm font-medium data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-2 text-gray-600"
            >
                <Building2 className="h-4 w-4" />
                Organisation
            </TabsTrigger>
          </TabsList>

          {/* --- ONGLET 1 : PROFIL --- */}
          <TabsContent value="profile" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
              <div className="grid gap-6 md:grid-cols-[250px_1fr]">
                  {/* Sidebar visuelle */}
                  <div className="hidden md:flex flex-col gap-4">
                      <div className="h-40 w-full rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col items-center justify-center gap-3 p-4">
                          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-200">
                              {firstInitial}{lastInitial}
                          </div>
                          <div className="text-center">
                              <p className="font-semibold text-sm text-gray-900">{profile?.first_name || 'Utilisateur'} {profile?.last_name || ''}</p>
                              <p className="text-xs text-gray-500 truncate max-w-[180px]">{user.email}</p>
                          </div>
                      </div>
                  </div>

                  {/* Formulaire */}
                  <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
                      <CardHeader className="bg-white border-b border-gray-100 pb-6">
                          <CardTitle className="text-xl">Informations personnelles</CardTitle>
                          <CardDescription>Mettez à jour votre identité sur la plateforme.</CardDescription>
                      </CardHeader>
                      <form action={updateProfile}>
                          <CardContent className="space-y-6 pt-6">
                              <div className="grid gap-2">
                                  <Label htmlFor="email" className="text-gray-700">Adresse Email</Label>
                                  <div className="relative">
                                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                      <Input 
                                          id="email" 
                                          value={user.email} 
                                          disabled 
                                          className="pl-9 bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed" 
                                      />
                                  </div>
                              </div>
                              <div className="grid md:grid-cols-2 gap-6">
                                  <div className="grid gap-2">
                                      <Label htmlFor="firstName" className="text-gray-700">Prénom</Label>
                                      <Input 
                                          id="firstName" 
                                          name="firstName" 
                                          defaultValue={profile?.first_name || ''} 
                                          placeholder="Jean"
                                          className="focus:ring-2 focus:ring-black/5"
                                      />
                                  </div>
                                  <div className="grid gap-2">
                                      <Label htmlFor="lastName" className="text-gray-700">Nom</Label>
                                      <Input 
                                          id="lastName" 
                                          name="lastName" 
                                          defaultValue={profile?.last_name || ''} 
                                          placeholder="Dupont"
                                          className="focus:ring-2 focus:ring-black/5"
                                      />
                                  </div>
                              </div>
                          </CardContent>
                          <CardFooter className="bg-gray-50/50 px-6 py-4 flex justify-between items-center border-t border-gray-100">
                              <p className="text-xs text-gray-500">Dernière mise à jour : automatique</p>
                              <Button type="submit" className="bg-black text-white hover:bg-zinc-800 shadow-lg shadow-black/10 transition-all active:scale-95">
                                  <Save className="h-4 w-4 mr-2" />
                                  Enregistrer
                              </Button>
                          </CardFooter>
                      </form>
                  </Card>
              </div>
          </TabsContent>

          {/* --- ONGLET 2 : ORGANISATION --- */}
          <TabsContent value="organization" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
              
              {org ? (
                  <>
                    {/* SECTION 1 : GESTION DE L'ÉQUIPE */}
                    <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="border-b border-gray-100 pb-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        Membres de l'équipe
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        Gérez les accès à cette organisation.
                                    </CardDescription>
                                </div>
                                <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                    <Users className="h-5 w-5" />
                                </div>
                            </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-6 pt-6">
                            {/* Formulaire d'invitation (visible seulement si admin idéalement, mais ok ici) */}
                            <div>
                                <InviteMemberForm />   
                            </div>

                            <Separator className="bg-gray-100" />
                            
                            <div className="space-y-4">
                                {members.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                                {member.profiles?.first_name?.[0] || member.profiles?.email?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {member.profiles?.first_name} {member.profiles?.last_name}
                                                    {member.user_id === user.id && <span className="text-gray-400 ml-1">(Vous)</span>}
                                                </p>
                                                <p className="text-xs text-gray-500">{member.profiles?.email}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            {member.role === 'owner' ? (
                                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1">
                                                    <Crown className="h-3 w-3" /> Admin
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                    Membre
                                                </Badge>
                                            )}

                                            {/* Bouton pour retirer (ne pas se retirer soi-même ici) */}
                                            {member.user_id !== user.id && currentUserRole === 'owner' && (
                                                <RemoveMemberButton userId={member.user_id} />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* SECTION 2 : CONFIGURATION API */}
                    <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="border-b border-gray-100 pb-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        Clés API & Technique
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        Connexion aux services tiers (Google PageSpeed).
                                    </CardDescription>
                                </div>
                                <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                                    <Key className="h-5 w-5" />
                                </div>
                            </div>
                        </CardHeader>
                        
                        <form action={updateOrgSettings}>
                            <input type="hidden" name="orgId" value={org.id} />
                            <CardContent className="space-y-8 pt-6">
                                <div className="grid gap-2 max-w-2xl">
                                    <Label className="text-gray-700 font-medium">Nom de l'organisation</Label>
                                    <div className="relative">
                                        <Input 
                                            value={org.name || 'Mon Organisation'} 
                                            disabled 
                                            className="bg-gray-50 border-gray-200 text-gray-600 font-medium cursor-default"
                                        />
                                        <div className="absolute right-3 top-2.5">
                                            <span className="px-2 py-0.5 bg-black text-white text-[10px] rounded-full font-bold tracking-wider">PRO</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 max-w-2xl">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="apiKey" className="text-gray-700 font-medium flex items-center gap-2">
                                            Clé API Google PageSpeed
                                        </Label>
                                        {org.google_api_key && (
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase border border-emerald-100">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                Connecté
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Key className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                        </div>
                                        <Input 
                                            id="apiKey" 
                                            name="apiKey" 
                                            type="password"
                                            defaultValue={org.google_api_key || ''} 
                                            placeholder="AIzaSy..." 
                                            className="pl-10 font-mono text-sm border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all h-11"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-gray-50/50 px-6 py-4 flex justify-end border-t border-gray-100">
                                <Button type="submit" className="bg-black text-white hover:bg-zinc-800 shadow-lg shadow-black/10 transition-all active:scale-95">
                                    <Save className="h-4 w-4 mr-2" />
                                    Sauvegarder
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                    {/* SECTION 3 : ZONE DE DANGER (Seulement pour OWNER) */}
                    {currentUserRole === 'owner' && (
                        <Card className="border-red-100 shadow-sm overflow-hidden bg-white">
                            <CardHeader className="border-b border-red-50 bg-red-50/30 pb-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl flex items-center gap-2 text-red-700">
                                            Zone de Danger
                                        </CardTitle>
                                        <CardDescription className="mt-1 text-red-600/80">
                                            Actions irréversibles pour cette organisation.
                                        </CardDescription>
                                    </div>
                                    <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                                        <AlertOctagon className="h-5 w-5" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="font-medium text-gray-900">Supprimer l'organisation</p>
                                    <p className="text-sm text-gray-500">
                                        Cela supprimera définitivement l'organisation <strong>{org.name}</strong> et toutes ses données.
                                    </p>
                                </div>
                                <DeleteOrgButton orgId={org.id} orgName={org.name} />
                            </CardContent>
                        </Card>
                    )}
                  </>
              ) : (
                  <CardContent className="py-16 flex flex-col items-center justify-center text-center text-gray-500">
                      <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Building2 className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Organisation introuvable</h3>
                      <p className="text-sm mt-1 max-w-sm">
                          Il semble que vous ne soyez rattaché à aucune organisation.
                      </p>
                  </CardContent>
              )}
          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}