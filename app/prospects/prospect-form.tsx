'use client'

// Prospect creation/edit form (Phase 2.5)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type { BusinessLine, Company, Contact, Opportunity } from '@/types/domain'
import { createOpportunityAction, updateOpportunityAction } from './actions'

const STAGES = [
  'À prospecter',
  'Contacté',
  'Échange',
  'Qualifié',
  'RDV',
  'Opportunité',
  'Proposition',
  'Gagné',
  'Perdu',
] as const

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

const SOURCES = [
  'Cold Call',
  'Cold Email',
  'LinkedIn',
  'Referral',
  'Website',
  'Partner',
  'Event',
  'Inbound',
  'Other',
] as const

const OWNERS = ['Eric', 'Lilian'] as const

interface ProspectFormProps {
  businessLines: BusinessLine[]
  companies: Company[]
  contacts: Contact[]
  defaultCompanyId?: string
  defaultContactId?: string
  opportunity?: Opportunity
  mode?: 'create' | 'edit'
  currentOwner?: 'Eric' | 'Lilian'
}

export function ProspectForm({
  businessLines,
  companies,
  contacts,
  defaultCompanyId,
  defaultContactId,
  opportunity,
  mode = 'create',
  currentOwner,
}: ProspectFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Company/Contact mode
  const [companyMode, setCompanyMode] = useState<'select' | 'create'>(
    defaultCompanyId || opportunity?.companyId ? 'select' : 'create'
  )
  const [contactMode, setContactMode] = useState<'select' | 'create'>(
    defaultContactId || opportunity?.primaryContactId ? 'select' : 'create'
  )

  async function handleSubmit(formData: FormData) {
    setError(null)

    const data = {
      name: formData.get('name') as string,
      businessLineId: formData.get('businessLineId') as string,
      owner: formData.get('owner') as any,
      stage: formData.get('stage') as any,
      priority: (formData.get('priority') as any) || undefined,
      source: (formData.get('source') as any) || undefined,
      potentialValue: formData.get('potentialValue')
        ? Number(formData.get('potentialValue'))
        : undefined,
      probability: formData.get('probability')
        ? Number(formData.get('probability'))
        : undefined,
      expectedCloseDate: (formData.get('expectedCloseDate') as string) || undefined,
      problem: (formData.get('problem') as string) || undefined,
      need: (formData.get('need') as string) || undefined,
      nextStepNotes: (formData.get('nextStepNotes') as string) || undefined,
      // Company
      companyId: companyMode === 'select' ? (formData.get('companyId') as string) : undefined,
      newCompanyName: companyMode === 'create' ? (formData.get('newCompanyName') as string) : undefined,
      // Contact
      contactId: contactMode === 'select' ? (formData.get('contactId') as string) : undefined,
      newContactFirstName: contactMode === 'create' ? (formData.get('newContactFirstName') as string) : undefined,
      newContactLastName: contactMode === 'create' ? (formData.get('newContactLastName') as string) : undefined,
      newContactEmail: contactMode === 'create' ? (formData.get('newContactEmail') as string) : undefined,
      newContactPhone: contactMode === 'create' ? (formData.get('newContactPhone') as string) : undefined,
      newContactJobTitle: contactMode === 'create' ? (formData.get('newContactJobTitle') as string) : undefined,
    }

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createOpportunityAction(data)
          : await updateOpportunityAction(opportunity!.id, data)

      if (result.success) {
        if (mode === 'create' && 'id' in result && result.id) {
          router.push(`/prospects/${result.id}`)
        } else {
          router.push(`/prospects/${opportunity!.id}`)
        }
        router.refresh()
      } else {
        setError(result.error || 'Erreur inconnue')
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-md p-4 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Opportunity Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations de l'opportunité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Nom <span className="text-red-500">*</span>
            </label>
            <Input
              name="name"
              required
              defaultValue={opportunity?.name}
              placeholder="Ex: Projet CRM pour Acme Corp"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Business Line <span className="text-red-500">*</span>
              </label>
              <Select name="businessLineId" required defaultValue={opportunity?.businessLineId}>
                <option value="">Sélectionner...</option>
                {businessLines.map((bl) => (
                  <option key={bl.id} value={bl.id}>
                    {bl.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Owner <span className="text-red-500">*</span>
              </label>
              <Select name="owner" required defaultValue={opportunity?.owner ?? currentOwner}>
                <option value="">Sélectionner...</option>
                {OWNERS.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Étape <span className="text-red-500">*</span>
              </label>
              <Select name="stage" required defaultValue={opportunity?.stage || 'À prospecter'}>
                {STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Priorité</label>
              <Select name="priority" defaultValue={opportunity?.priority || ''}>
                <option value="">Aucune</option>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Source</label>
              <Select name="source" defaultValue={opportunity?.source || ''}>
                <option value="">Non spécifiée</option>
                {SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Valeur potentielle (€)
              </label>
              <Input
                name="potentialValue"
                type="number"
                step="1"
                defaultValue={opportunity?.potentialValue || ''}
                placeholder="Ex: 5000"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Probabilité (%)
              </label>
              <Input
                name="probability"
                type="number"
                min="0"
                max="100"
                step="5"
                defaultValue={opportunity?.probability || ''}
                placeholder="Ex: 50"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Date de closing estimée
              </label>
              <Input
                name="expectedCloseDate"
                type="date"
                defaultValue={opportunity?.expectedCloseDate || ''}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Entreprise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={companyMode === 'select' ? 'primary' : 'ghost'}
              onClick={() => setCompanyMode('select')}
            >
              Sélectionner
            </Button>
            <Button
              type="button"
              size="sm"
              variant={companyMode === 'create' ? 'primary' : 'ghost'}
              onClick={() => setCompanyMode('create')}
            >
              Créer nouvelle
            </Button>
          </div>

          {companyMode === 'select' ? (
            <div>
              <label className="text-sm font-medium mb-1 block">Entreprise</label>
              <Select
                name="companyId"
                defaultValue={defaultCompanyId || opportunity?.companyId || ''}
              >
                <option value="">Aucune</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium mb-1 block">
                Nom de l'entreprise
              </label>
              <Input
                name="newCompanyName"
                placeholder="Ex: Acme Corporation"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={contactMode === 'select' ? 'primary' : 'ghost'}
              onClick={() => setContactMode('select')}
            >
              Sélectionner
            </Button>
            <Button
              type="button"
              size="sm"
              variant={contactMode === 'create' ? 'primary' : 'ghost'}
              onClick={() => setContactMode('create')}
            >
              Créer nouveau
            </Button>
          </div>

          {contactMode === 'select' ? (
            <div>
              <label className="text-sm font-medium mb-1 block">Contact</label>
              <Select
                name="contactId"
                defaultValue={defaultContactId || opportunity?.primaryContactId || ''}
              >
                <option value="">Aucun</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                    {contact.jobTitle ? ` - ${contact.jobTitle}` : ''}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Prénom</label>
                  <Input name="newContactFirstName" placeholder="Ex: Jean" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Nom</label>
                  <Input name="newContactLastName" placeholder="Ex: Dupont" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input
                    name="newContactEmail"
                    type="email"
                    placeholder="jean@acme.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Téléphone</label>
                  <Input
                    name="newContactPhone"
                    type="tel"
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Fonction</label>
                <Input
                  name="newContactJobTitle"
                  placeholder="Ex: Directeur Commercial"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contexte commercial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Problème</label>
            <Textarea
              name="problem"
              defaultValue={opportunity?.problem || ''}
              placeholder="Quel problème rencontre le prospect ?"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Besoin</label>
            <Textarea
              name="need"
              defaultValue={opportunity?.need || ''}
              placeholder="Quel est le besoin exprimé ?"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Notes prochaines étapes
            </label>
            <Textarea
              name="nextStepNotes"
              defaultValue={opportunity?.nextStepNotes || ''}
              placeholder="Notes sur la suite à donner..."
              rows={2}
            />
            <p className="text-xs text-text-muted mt-1">
              Note : La prochaine action réelle reste dérivée des tâches TODO
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? mode === 'create'
              ? 'Création...'
              : 'Enregistrement...'
            : mode === 'create'
              ? 'Créer le prospect'
              : 'Enregistrer'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Annuler
        </Button>
      </div>
    </form>
  )
}
