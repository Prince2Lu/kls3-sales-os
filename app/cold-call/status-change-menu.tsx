'use client'

// Quick status change menu for prospecting targets
// Multi-channel: cold call, email, LinkedIn, referrals, etc.

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ProspectingStatus } from '@/types/domain'

interface StatusChangeMenuProps {
  onSelect: (status: ProspectingStatus) => void
  onCancel: () => void
  currentStatus: ProspectingStatus
}

const PROSPECTING_STATUSES: { value: ProspectingStatus; label: string; description?: string }[] = [
  { value: 'À contacter', label: 'À contacter', description: 'Prospect non contacté' },
  { value: 'Relance prévue', label: 'Relance prévue', description: 'Relance programmée' },
  { value: 'En séquence', label: 'En séquence', description: 'Séquence email/LinkedIn active' },
  { value: 'Non joignable', label: 'Non joignable', description: 'Coordonnées invalides' },
  { value: 'Hors cible', label: 'Hors cible', description: 'Pas intéressé ou hors profil' },
  { value: 'Converti', label: 'Converti', description: 'Converti en opportunité' },
]

export function StatusChangeMenu({
  onSelect,
  onCancel,
  currentStatus,
}: StatusChangeMenuProps) {
  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
      <Card className="max-w-sm w-full p-4 space-y-3">
        <div>
          <h3 className="text-lg font-bold font-syne">Changer le statut</h3>
          <p className="text-xs text-text-muted mt-1">
            Statut actuel : {currentStatus}
          </p>
        </div>

        <div className="space-y-2">
          {PROSPECTING_STATUSES.map((status) => (
            <Button
              key={status.value}
              onClick={() => onSelect(status.value)}
              variant={status.value === currentStatus ? 'primary' : 'ghost'}
              className="w-full justify-start flex-col items-start gap-0.5"
              disabled={status.value === currentStatus}
            >
              <span>{status.label}</span>
              {status.description && (
                <span className="text-xs text-text-muted font-normal">
                  {status.description}
                </span>
              )}
            </Button>
          ))}
        </div>

        <Button onClick={onCancel} variant="ghost" className="w-full">
          Annuler
        </Button>
      </Card>
    </div>
  )
}
