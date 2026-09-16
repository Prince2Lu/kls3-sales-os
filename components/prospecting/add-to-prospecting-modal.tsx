'use client'

// Modal: Ajouter à la prospection
// Shared modal for Company and Contact detail pages
// With UX pre-check to inform user BEFORE adding

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import {
  addToProspecting,
  checkProspectingTarget,
  type AddToProspectingAction,
  type ProspectingCheckResult,
} from '@/lib/actions/prospecting-actions'
import type { BusinessLine, Contact, Owner } from '@/types/domain'

interface AddToProspectingModalProps {
  companyId: string
  companyName: string
  contacts: Contact[]
  businessLines: BusinessLine[]
  preSelectedContactId?: string // For Contact page: auto-select contact
  currentOwner: Owner
  onClose: () => void
}

export function AddToProspectingModal({
  companyId,
  companyName,
  contacts,
  businessLines,
  preSelectedContactId,
  currentOwner,
  onClose,
}: AddToProspectingModalProps) {
  const router = useRouter()

  // Form state
  const [businessLineId, setBusinessLineId] = useState<string>('')
  const [owner, setOwner] = useState<Owner>(currentOwner)
  const [contactId, setContactId] = useState<string | undefined>(preSelectedContactId)

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{
    action: AddToProspectingAction
    targetId: string
    message: string
  } | null>(null)

  // Pre-check state
  const [isChecking, setIsChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<ProspectingCheckResult | null>(null)

  // Auto-select contact if only one exists
  useEffect(() => {
    if (!preSelectedContactId && contacts.length === 1) {
      setContactId(contacts[0].id)
    }
  }, [contacts, preSelectedContactId])

  // Filter Business Lines: only PROSPECTING or COLD_CALL
  const prospectingBusinessLines = businessLines.filter(
    (bl) => bl.prospectingMode === 'PROSPECTING' || bl.prospectingMode === 'COLD_CALL'
  )

  // Auto-select first BL if only one
  useEffect(() => {
    if (prospectingBusinessLines.length === 1 && !businessLineId) {
      setBusinessLineId(prospectingBusinessLines[0].id)
    }
  }, [prospectingBusinessLines, businessLineId])

  // Pre-check when BL or Contact changes
  useEffect(() => {
    if (!businessLineId) {
      setCheckResult(null)
      return
    }

    const performCheck = async () => {
      setIsChecking(true)
      try {
        const result = await checkProspectingTarget({
          companyId,
          businessLineId,
          contactId,
        })
        setCheckResult(result)
      } catch (err) {
        // On error, clear check (submit will handle validation)
        setCheckResult(null)
      } finally {
        setIsChecking(false)
      }
    }

    // Debounce check (300ms)
    const timeout = setTimeout(performCheck, 300)
    return () => clearTimeout(timeout)
  }, [companyId, businessLineId, contactId])

  const handleSubmit = async () => {
    setError(null)

    // Validation
    if (!businessLineId) {
      setError('Veuillez sélectionner une Business Line')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await addToProspecting({
        companyId,
        businessLineId,
        contactId,
        owner,
      })

      if (!result.success) {
        setError(result.message)
        setIsSubmitting(false)
        return
      }

      // Success
      setSuccess({
        action: result.action!,
        targetId: result.targetId!,
        message: result.message,
      })

      // Auto-close after 2s
      setTimeout(() => {
        router.refresh()
        onClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
      setIsSubmitting(false)
    }
  }

  // Get selected contact name
  const selectedContact = contactId
    ? contacts.find((c) => c.id === contactId)
    : null

  // Success view
  if (success) {
    return (
      <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 space-y-4">
          <div className="text-center space-y-3">
            <div className="text-4xl">✓</div>
            <h3 className="text-lg font-bold font-syne">{success.message}</h3>

            {success.action === 'REUSED' && (
              <p className="text-sm text-text-muted">
                La cible existe déjà. Aucune modification effectuée.
              </p>
            )}

            {success.action === 'ENRICHED' && (
              <p className="text-sm text-text-muted">
                Le contact a été ajouté à la cible existante.
              </p>
            )}

            {success.action === 'CREATED' && (
              <p className="text-sm text-text-muted">
                La cible a été créée avec le statut "À appeler".
              </p>
            )}

            <div className="pt-2">
              <a
                href="/cold-call"
                className="text-accent hover:underline text-sm"
              >
                Voir dans la prospection →
              </a>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Form view
  return (
    <div
      className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <Card className="max-w-md w-full p-6 space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-bold font-syne">Ajouter à la prospection</h3>
          <p className="text-sm text-text-muted mt-1">{companyName}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          {/* Business Line */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Business Line <span className="text-red-400">*</span>
            </label>
            <select
              value={businessLineId}
              onChange={(e) => setBusinessLineId(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
              disabled={isSubmitting}
            >
              <option value="">Sélectionner...</option>
              {prospectingBusinessLines.map((bl) => (
                <option key={bl.id} value={bl.id}>
                  {bl.name}
                </option>
              ))}
            </select>
            {prospectingBusinessLines.length === 0 && (
              <p className="text-xs text-text-muted mt-1">
                Aucune Business Line avec mode prospection disponible
              </p>
            )}
          </div>

          {/* Owner */}
          <div>
            <label className="block text-sm font-medium mb-2">Owner</label>
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value as Owner)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
              disabled={isSubmitting}
            >
              <option value="Eric">Eric</option>
              <option value="Lilian">Lilian</option>
            </select>
          </div>

          {/* Contact */}
          <div>
            <label className="block text-sm font-medium mb-2">Contact</label>
            <select
              value={contactId || ''}
              onChange={(e) => setContactId(e.target.value || undefined)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
              disabled={isSubmitting || !!preSelectedContactId}
            >
              <option value="">Aucun contact (cible entreprise)</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.firstName} {contact.lastName}
                  {contact.jobTitle ? ` — ${contact.jobTitle}` : ''}
                </option>
              ))}
            </select>
            {contacts.length === 0 && (
              <p className="text-xs text-text-muted mt-1">
                Aucun contact disponible pour cette entreprise
              </p>
            )}
            {preSelectedContactId && (
              <p className="text-xs text-text-muted mt-1">
                Contact présélectionné depuis la fiche contact
              </p>
            )}
          </div>

          {/* Pre-check result messages */}
          {isChecking && businessLineId && (
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-text-muted">Vérification...</p>
            </div>
          )}

          {!isChecking && checkResult && businessLineId && (
            <>
              {/* CASE 1: EXISTING - Target already exists */}
              {checkResult.state === 'EXISTING' && (
                <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-medium text-text-primary">
                    Déjà en prospection — {checkResult.status}
                  </p>
                  <a
                    href="/cold-call"
                    className="text-xs text-accent hover:underline inline-block"
                  >
                    Voir dans Prospection →
                  </a>
                </div>
              )}

              {/* CASE 2: WILL_ENRICH - Contactless target will be enriched */}
              {checkResult.state === 'WILL_ENRICH' && selectedContact && (
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-text-muted">
                    Cette cible existe déjà sans contact.
                    <br />
                    Elle sera enrichie avec{' '}
                    <span className="font-medium text-text-primary">
                      {selectedContact.firstName} {selectedContact.lastName}
                    </span>
                    .
                  </p>
                </div>
              )}

              {/* CASE 3: OTHER_CONTACT_EXISTS - Different contact exists */}
              {checkResult.state === 'OTHER_CONTACT_EXISTS' && selectedContact && (
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-text-muted">
                    Cette entreprise est déjà prospectée via un autre contact.
                    <br />
                    Une nouvelle cible sera créée pour{' '}
                    <span className="font-medium text-text-primary">
                      {selectedContact.firstName} {selectedContact.lastName}
                    </span>
                    .
                  </p>
                </div>
              )}

              {/* CASE 4: NEW - No special message, normal flow */}
              {checkResult.state === 'NEW' && (
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-text-muted">
                    <span className="font-medium text-text-primary">Statut initial:</span> À
                    appeler
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    La cible sera créée avec le statut "À appeler" et sera visible dans la
                    prospection.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Default info if no BL selected */}
          {!businessLineId && (
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-text-muted">
                Sélectionnez une Business Line pour vérifier si cette cible existe déjà.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={onClose}
            variant="ghost"
            className="flex-1"
            disabled={isSubmitting}
          >
            Annuler
          </Button>

          {checkResult?.state === 'EXISTING' ? (
            // If target already exists, disable "Ajouter" and only show "Voir"
            <Button
              onClick={() => router.push('/cold-call')}
              variant="primary"
              className="flex-1"
            >
              Voir dans Prospection
            </Button>
          ) : (
            // Normal "Ajouter" button
            <Button
              onClick={handleSubmit}
              variant="primary"
              className="flex-1"
              disabled={
                isSubmitting || isChecking || prospectingBusinessLines.length === 0
              }
            >
              {isSubmitting ? 'Ajout...' : 'Ajouter'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
