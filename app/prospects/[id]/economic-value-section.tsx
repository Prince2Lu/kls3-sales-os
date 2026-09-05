'use client'

// Economic Value Section for Opportunity Detail
// Phase 9: Shows VALUE_EVENTS and registration CTA

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ValueEvent, BusinessLine } from '@/types/domain'
import { ValueEventForm } from './value-event/value-event-form'

interface EconomicValueSectionProps {
  opportunityId: string
  businessLine: BusinessLine
  valueEvents: ValueEvent[]
}

// French status labels
function getFrenchStatus(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'En attente'
    case 'CONFIRMED':
      return 'Confirmé'
    case 'PAID':
      return 'Payé'
    case 'CANCELLED':
      return 'Annulé'
    default:
      return status
  }
}

// Status badge variant
function getStatusVariant(status: string): 'default' | 'accent' | 'muted' {
  switch (status) {
    case 'CONFIRMED':
    case 'PAID':
      return 'accent'
    case 'PENDING':
      return 'default'
    case 'CANCELLED':
      return 'muted'
    default:
      return 'default'
  }
}

// Human-readable event label
function getEventLabel(eventType: string): string {
  switch (eventType) {
    case 'PAID_MEETING':
      return 'RDV rémunéré'
    case 'SIGNED_DEAL':
      return 'Deal signé'
    case 'SUBSCRIPTION_STARTED':
      return 'Abonnement démarré'
    case 'SIGNED_PROJECT':
      return 'Projet signé'
    default:
      return 'Événement économique'
  }
}

// Revenue type label
function getRevenueTypeLabel(revenueType: string): string {
  switch (revenueType) {
    case 'ONE_SHOT':
      return 'Ponctuel'
    case 'MRR':
      return 'MRR'
    case 'PROJECT':
      return 'Projet'
    default:
      return revenueType
  }
}

export function EconomicValueSection({
  opportunityId,
  businessLine,
  valueEvents,
}: EconomicValueSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ValueEvent | null>(null)

  // Check for active events (not cancelled)
  const activeEvents = valueEvents.filter(
    (ve) => ve.status === 'PENDING' || ve.status === 'CONFIRMED' || ve.status === 'PAID'
  )

  // Duplicate protection: PAUL allows multiple, others don't
  const canAddEvent =
    businessLine.revenueTrigger === 'PAID_MEETING' || activeEvents.length === 0

  // Sort events by date descending (most recent first)
  const sortedEvents = [...valueEvents].sort(
    (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Valeur économique</CardTitle>
          {!showForm && canAddEvent && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-1.5 text-sm bg-accent text-white rounded-full hover:bg-accent/90 transition-colors"
            >
              Enregistrer la valeur
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form - Create or Edit */}
        {(showForm || editingEvent) && (
          <ValueEventForm
            opportunityId={opportunityId}
            businessLine={businessLine}
            existingEvent={editingEvent || undefined}
            onCancel={() => {
              setShowForm(false)
              setEditingEvent(null)
            }}
          />
        )}

        {/* Duplicate warning for non-PAUL BLs */}
        {!showForm && !canAddEvent && activeEvents.length > 0 && (
          <div className="p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
            <p className="text-amber-400 text-sm">
              Un événement économique actif existe déjà pour cette opportunité.
            </p>
          </div>
        )}

        {/* History */}
        {sortedEvents.length > 0 && !showForm && !editingEvent ? (
          <div className="space-y-3">
            <div className="text-text-muted text-xs mb-2">Historique</div>
            {sortedEvents.map((ve) => (
              <div
                key={ve.id}
                className="p-3 bg-[#0D0D0D] border border-border rounded-lg space-y-2"
              >
                {/* Event type and status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm">
                      {getEventLabel(ve.eventType)}
                    </div>
                    <button
                      onClick={() => setEditingEvent(ve)}
                      className="text-xs text-accent hover:text-accent/80 underline"
                    >
                      Modifier
                    </button>
                  </div>
                  <Badge variant={getStatusVariant(ve.status)}>
                    {getFrenchStatus(ve.status)}
                  </Badge>
                </div>

                {/* Amount and revenue type */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-accent font-bold">
                    {ve.amount.toLocaleString('fr-FR')} €
                    {ve.revenueType === 'MRR' && '/mois'}
                  </span>
                  <span className="text-text-muted text-xs">
                    · {getRevenueTypeLabel(ve.revenueType)}
                  </span>
                </div>

                {/* Event date */}
                <div className="text-xs text-text-muted">
                  {new Date(ve.eventDate).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>

                {/* Notes */}
                {ve.notes && (
                  <div className="text-sm text-text-muted pt-1 border-t border-border">
                    {ve.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          !showForm && (
            <p className="text-text-muted text-sm">
              Aucun événement économique enregistré
            </p>
          )
        )}
      </CardContent>
    </Card>
  )
}
