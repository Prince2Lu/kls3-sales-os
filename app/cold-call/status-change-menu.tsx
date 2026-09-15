'use client'

// Quick status change menu for cold call targets

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { CallStatus } from '@/types/domain'

interface StatusChangeMenuProps {
  onSelect: (status: CallStatus) => void
  onCancel: () => void
  currentStatus: CallStatus
}

const CALL_STATUSES: { value: CallStatus; label: string }[] = [
  { value: 'À appeler', label: 'À appeler' },
  { value: 'À rappeler', label: 'À rappeler' },
  { value: 'Email Flow', label: 'Email Flow' },
  { value: 'Mauvais numéro', label: 'Mauvais numéro' },
  { value: 'Pas intéressé', label: 'Pas intéressé' },
  { value: 'RDV booké', label: 'RDV booké' },
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
          {CALL_STATUSES.map((status) => (
            <Button
              key={status.value}
              onClick={() => onSelect(status.value)}
              variant={status.value === currentStatus ? 'primary' : 'ghost'}
              className="w-full justify-start"
              disabled={status.value === currentStatus}
            >
              {status.label}
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
