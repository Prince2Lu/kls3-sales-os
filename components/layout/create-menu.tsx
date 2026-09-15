// Create menu dropdown - Primary CTA with options
// Allows creating opportunities, companies, contacts

'use client'

import { useRouter } from 'next/navigation'
import { Plus, Briefcase, Building2, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export function CreateMenu() {
  const router = useRouter()

  const trigger = (
    <Button size="sm" className="gap-1.5 whitespace-nowrap">
      <Plus className="w-4 h-4" />
      <span>Créer</span>
    </Button>
  )

  return (
    <DropdownMenu trigger={trigger} align="right">
      <DropdownMenuItem
        onClick={() => router.push('/prospects/new')}
        className="gap-3"
      >
        <Briefcase className="w-4 h-4 text-accent" />
        <div>
          <div className="font-medium">Nouvelle opportunité</div>
          <div className="text-xs text-text-muted">
            Créer un dossier commercial
          </div>
        </div>
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={() => router.push('/companies/new')}
        className="gap-3"
      >
        <Building2 className="w-4 h-4 text-accent" />
        <div>
          <div className="font-medium">Nouvelle entreprise</div>
          <div className="text-xs text-text-muted">Ajouter une société</div>
        </div>
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={() => router.push('/contacts/new')}
        className="gap-3"
      >
        <User className="w-4 h-4 text-accent" />
        <div>
          <div className="font-medium">Nouveau contact</div>
          <div className="text-xs text-text-muted">
            Ajouter un interlocuteur
          </div>
        </div>
      </DropdownMenuItem>
    </DropdownMenu>
  )
}
