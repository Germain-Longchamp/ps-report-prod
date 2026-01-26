'use client'

import { Check, ChevronsUpDown, Building2, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { switchOrganization } from "@/app/actions"
import { CreateOrgModal } from "./CreateOrgModal"

interface Org {
  id: number
  name: string
}

interface OrgSwitcherProps {
  organizations: Org[]
  currentOrgId: number
}

export function OrgSwitcher({ organizations, currentOrgId }: OrgSwitcherProps) {
  // Sécurité si currentOrgId est invalide ou vide
  const activeOrg = organizations.find(o => o.id === currentOrgId) || organizations[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="lg"
          className="w-full justify-between px-2 hover:bg-zinc-800 text-zinc-400 hover:text-white mb-6 h-12 border border-transparent hover:border-zinc-700 transition-all"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-white">
                {activeOrg?.name || "Organisation"}
              </span>
              <span className="truncate text-xs text-zinc-500">
                {organizations.length > 1 ? "Changer d'espace..." : "Espace unique"}
              </span>
            </div>
          </div>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-[240px] bg-zinc-950 border-zinc-800 text-zinc-400 ml-2 shadow-xl">
        <DropdownMenuLabel className="text-zinc-500 text-xs uppercase tracking-wider pl-2 py-2">
            Mes Organisations
        </DropdownMenuLabel>
        
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchOrganization(org.id.toString())}
            className="focus:bg-zinc-900 focus:text-white cursor-pointer flex items-center justify-between py-2.5 px-2 rounded-md mx-1 my-0.5"
          >
            <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-zinc-500" />
                <span className={org.id === currentOrgId ? "text-white font-medium" : ""}>
                    {org.name}
                </span>
            </div>
            {org.id === currentOrgId && <Check className="h-4 w-4 text-indigo-500" />}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator className="bg-zinc-800 my-2" />
        
        {/* Modale d'ajout */}
        <CreateOrgModal>
            <DropdownMenuItem 
                onSelect={(e) => e.preventDefault()} // Empêche la fermeture du menu dropdown
                className="gap-2 p-2 focus:bg-zinc-900 focus:text-white cursor-pointer mx-1 mb-1 rounded-md text-indigo-400 hover:text-indigo-300 hover:bg-zinc-900"
            >
                <div className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-zinc-700 bg-transparent">
                    <PlusCircle className="h-4 w-4" />
                </div>
                <div className="font-medium text-xs">Créer une organisation</div>
            </DropdownMenuItem>
        </CreateOrgModal>

      </DropdownMenuContent>
    </DropdownMenu>
  )
}