'use client'

// VALUE_EVENT Registration Form
// Phase 9: Business Line-aware economic event registration

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BusinessLine, ValueEventStatus, ValueEvent } from '@/types/domain'
import { registerValueEvent, updateValueEventAction, type RegisterValueEventInput, type UpdateValueEventInput } from './actions'

interface ValueEventFormProps {
  opportunityId: string
  businessLine: BusinessLine
  existingEvent?: ValueEvent // Optional: if editing existing event
  onCancel: () => void
}

// Calymia subscription plans
const CALYMIA_PLANS = [
  { name: 'Essentiel', amount: 29 },
  { name: 'Pro', amount: 59 },
  { name: 'Cabinet', amount: 139 },
]

export function ValueEventForm({
  opportunityId,
  businessLine,
  existingEvent,
  onCancel,
}: ValueEventFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditMode = !!existingEvent

  // Form state - initialize from existingEvent if editing
  const [eventDate, setEventDate] = useState(
    existingEvent?.eventDate || new Date().toISOString().split('T')[0]
  )
  const [amount, setAmount] = useState<number>(
    existingEvent?.amount || businessLine.defaultUnitValue || 0
  )
  const [status, setStatus] = useState<ValueEventStatus>(
    existingEvent?.status || 'PENDING'
  )
  const [notes, setNotes] = useState(existingEvent?.notes || '')
  const [selectedPlan, setSelectedPlan] = useState<string>('')

  // Business Line specific labels
  const getEventLabel = () => {
    switch (businessLine.revenueTrigger) {
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

  const getDateLabel = () => {
    switch (businessLine.revenueTrigger) {
      case 'PAID_MEETING':
        return 'Date du RDV'
      case 'SIGNED_DEAL':
        return 'Date de signature'
      case 'SUBSCRIPTION_STARTED':
        return 'Date de démarrage'
      case 'SIGNED_PROJECT':
        return 'Date de signature'
      default:
        return 'Date de l\'événement'
    }
  }

  // Handle Calymia plan selection
  const handlePlanChange = (planName: string) => {
    setSelectedPlan(planName)
    const plan = CALYMIA_PLANS.find((p) => p.name === planName)
    if (plan) {
      setAmount(plan.amount)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (isEditMode && existingEvent) {
        // Update existing VALUE_EVENT
        const updateInput: UpdateValueEventInput = {
          valueEventId: existingEvent.id,
          eventDate,
          amount,
          status,
          notes: notes.trim() || undefined,
        }

        const result = await updateValueEventAction(updateInput)

        if (result.success) {
          router.refresh()
          onCancel() // Close form
        } else {
          setError(result.error || 'Une erreur est survenue')
        }
      } else {
        // Create new VALUE_EVENT
        const createInput: RegisterValueEventInput = {
          opportunityId,
          eventDate,
          amount,
          status,
          notes: notes.trim() || undefined,
        }

        const result = await registerValueEvent(createInput)

        if (result.success) {
          router.refresh()
          onCancel() // Close form
        } else {
          setError(result.error || 'Une erreur est survenue')
        }
      }
    } catch (err: any) {
      setError('Une erreur est survenue lors de l\'enregistrement')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-card-bg border border-border rounded-2xl p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold font-syne mb-1">
          {isEditMode ? 'Modifier l\'événement' : getEventLabel()}
        </h3>
        <p className="text-text-muted text-sm">
          Business Line: {businessLine.name}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Calymia: Plan Selector - Only show in create mode */}
        {!isEditMode && businessLine.code === 'CALYMIA' && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Plan d'abonnement
            </label>
            <select
              value={selectedPlan}
              onChange={(e) => handlePlanChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0D0D0D] border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              required
            >
              <option value="">Sélectionner un plan</option>
              {CALYMIA_PLANS.map((plan) => (
                <option key={plan.name} value={plan.name}>
                  {plan.name} — {plan.amount} €/mois
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Event Date */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            {getDateLabel()}
          </label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#0D0D0D] border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
        </div>

        {/* Status - Moved up for visibility */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Statut
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ValueEventStatus)}
            className="w-full px-4 py-2.5 bg-[#0D0D0D] border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            required
          >
            <option value="PENDING">En attente</option>
            <option value="CONFIRMED">Confirmé</option>
            <option value="PAID">Payé</option>
            <option value="CANCELLED">Annulé</option>
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Montant
            {businessLine.revenueType === 'MRR' && (
              <span className="text-text-muted ml-1">(€/mois)</span>
            )}
            {businessLine.revenueType !== 'MRR' && (
              <span className="text-text-muted ml-1">(€)</span>
            )}
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
            className="w-full px-4 py-2.5 bg-[#0D0D0D] border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Notes (optionnel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 bg-[#0D0D0D] border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            placeholder="Contexte ou informations complémentaires..."
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-2.5 bg-accent text-white rounded-full font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting
              ? isEditMode
                ? 'Mise à jour...'
                : 'Enregistrement...'
              : isEditMode
                ? 'Mettre à jour'
                : 'Enregistrer la valeur'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-6 py-2.5 bg-transparent border border-border text-text-primary rounded-full font-medium hover:bg-[rgba(255,255,255,0.02)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
