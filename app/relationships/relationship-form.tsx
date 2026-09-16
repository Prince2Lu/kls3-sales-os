'use client'

// Relationship form component (Phase 2)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Company, Contact, Relationship, Owner } from '@/types/domain'
import { createRelationshipAction, updateRelationshipAction } from './actions'

interface RelationshipFormProps {
  companies: Company[]
  contacts: Contact[]
  currentOwner: Owner
  defaultCompanyId?: string
  defaultContactId?: string
  relationship?: Relationship
  mode: 'create' | 'edit'
}

export function RelationshipForm({
  companies,
  contacts,
  currentOwner,
  defaultCompanyId,
  defaultContactId,
  relationship,
  mode,
}: RelationshipFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null)

      const data = {
        name: formData.get('name') as string,
        companyId: (formData.get('companyId') as string) || undefined,
        contactId: (formData.get('contactId') as string) || undefined,
        owner: (formData.get('owner') as Owner) || currentOwner,
        relationshipType: formData.get('relationshipType') as any,
        status: formData.get('status') as any,
        objective: (formData.get('objective') as string) || undefined,
        importance: formData.get('importance') as any,
        notes: (formData.get('notes') as string) || undefined,
      }

      const result =
        mode === 'create'
          ? await createRelationshipAction(data)
          : await updateRelationshipAction(relationship!.id, data)

      if (result.success) {
        if (mode === 'create' && 'id' in result && result.id) {
          router.push(`/relationships/${result.id}`)
        } else {
          router.push(`/relationships/${relationship!.id}`)
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

      <Card className="p-6">
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Nom de la relation *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              defaultValue={relationship?.name}
              placeholder="Ex: Jean Dupont - Prescripteur Notaires"
              required
              className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Type */}
          <div>
            <label htmlFor="relationshipType" className="block text-sm font-medium mb-2">
              Type de relation *
            </label>
            <select
              id="relationshipType"
              name="relationshipType"
              defaultValue={relationship?.relationshipType}
              required
              className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">-- Sélectionner --</option>
              <option value="Réseau">Réseau</option>
              <option value="Prescripteur">Prescripteur</option>
              <option value="Apporteur">Apporteur</option>
              <option value="Partenaire">Partenaire</option>
              <option value="Institution">Institution</option>
              <option value="Contact stratégique">Contact stratégique</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          {/* Status and Importance */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium mb-2">
                Statut *
              </label>
              <select
                id="status"
                name="status"
                defaultValue={relationship?.status || 'À activer'}
                required
                className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="À activer">À activer</option>
                <option value="En discussion">En discussion</option>
                <option value="Action prévue">Action prévue</option>
                <option value="Actif">Actif</option>
                <option value="Dormant">Dormant</option>
                <option value="Clos">Clos</option>
              </select>
            </div>

            <div>
              <label htmlFor="importance" className="block text-sm font-medium mb-2">
                Importance *
              </label>
              <select
                id="importance"
                name="importance"
                defaultValue={relationship?.importance || 'Normale'}
                required
                className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="Haute">Haute</option>
                <option value="Normale">Normale</option>
                <option value="Faible">Faible</option>
              </select>
            </div>
          </div>

          {/* Company and Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="companyId" className="block text-sm font-medium mb-2">
                Entreprise liée
              </label>
              <select
                id="companyId"
                name="companyId"
                defaultValue={relationship?.companyId || defaultCompanyId || ''}
                className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">-- Aucune --</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="contactId" className="block text-sm font-medium mb-2">
                Contact principal
              </label>
              <select
                id="contactId"
                name="contactId"
                defaultValue={relationship?.contactId || defaultContactId || ''}
                className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">-- Aucun --</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Owner */}
          <div>
            <label htmlFor="owner" className="block text-sm font-medium mb-2">
              Responsable *
            </label>
            <select
              id="owner"
              name="owner"
              defaultValue={relationship?.owner || currentOwner}
              required
              className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="Eric">Eric</option>
              <option value="Lilian">Lilian</option>
            </select>
          </div>

          {/* Objective */}
          <div>
            <label htmlFor="objective" className="block text-sm font-medium mb-2">
              Objectif de la relation
            </label>
            <textarea
              id="objective"
              name="objective"
              defaultValue={relationship?.objective || ''}
              rows={3}
              placeholder="Ex: Obtenir 2 recommandations par mois"
              className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={relationship?.notes || ''}
              rows={4}
              placeholder="Notes internes..."
              className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? 'Enregistrement...'
            : mode === 'create'
            ? 'Créer la relation'
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
