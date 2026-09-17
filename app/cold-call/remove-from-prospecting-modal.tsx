'use client'

// Remove from Prospecting Confirmation Modal

import { Button } from '@/components/ui/button'
import type { Company, Contact, BusinessLine, CallStatus } from '@/types/domain'

interface RemoveFromProspectingModalProps {
  company: Company | null
  contact: Contact | null
  businessLine: BusinessLine | null
  callStatus: CallStatus
  openTasksCount: number
  onConfirm: () => void
  onCancel: () => void
}

export function RemoveFromProspectingModal({
  company,
  contact,
  businessLine,
  callStatus,
  openTasksCount,
  onConfirm,
  onCancel,
}: RemoveFromProspectingModalProps) {
  return (
    <div
      className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-card-bg border border-border rounded-lg shadow-xl max-w-md w-full p-6 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold font-syne">
            Retirer de la prospection
          </h2>
        </div>

        {/* Target Info */}
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-text-muted">Entreprise :</span>{' '}
            <span className="text-text-primary font-medium">
              {company?.name || 'Inconnue'}
            </span>
          </div>
          {contact && (
            <div>
              <span className="text-text-muted">Contact :</span>{' '}
              <span className="text-text-primary">
                {contact.firstName} {contact.lastName}
              </span>
            </div>
          )}
          <div>
            <span className="text-text-muted">Business Line :</span>{' '}
            <span className="text-text-primary">
              {businessLine?.code === 'SACHA' ? 'Leverio' : businessLine?.name || 'Inconnue'}
            </span>
          </div>
          <div>
            <span className="text-text-muted">Statut actuel :</span>{' '}
            <span className="text-text-primary">{callStatus}</span>
          </div>
        </div>

        {/* Warning */}
        <div className="space-y-3 text-sm">
          <p className="text-text-primary">
            Cette cible ne sera plus affichée dans la prospection active.
          </p>
          <p className="text-text-muted">
            Son historique commercial sera conservé (activities, tasks, opportunités).
          </p>
          {openTasksCount > 0 && (
            <p className="text-accent">
              {openTasksCount} tâche{openTasksCount > 1 ? 's' : ''} ouverte
              {openTasksCount > 1 ? 's' : ''} restera
              {openTasksCount > 1 ? 'ont' : ''} active
              {openTasksCount > 1 ? 's' : ''}.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <Button variant="ghost" onClick={onCancel} size="sm">
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            size="sm"
            className="bg-red-600 hover:bg-red-700"
          >
            Retirer de la prospection
          </Button>
        </div>
      </div>
    </div>
  )
}
