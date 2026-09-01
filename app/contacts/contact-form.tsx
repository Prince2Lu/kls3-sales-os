'use client'

// Contact form component (Phase 2.5 bugfix)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Company, Contact } from '@/types/domain'
import { createContactAction, updateContactAction } from './actions'

interface ContactFormProps {
  companies: Company[]
  defaultCompanyId?: string
  contact?: Contact
  mode: 'create' | 'edit'
}

export function ContactForm({
  companies,
  defaultCompanyId,
  contact,
  mode,
}: ContactFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null)

      const data = {
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        companyId: (formData.get('companyId') as string) || undefined,
        jobTitle: (formData.get('jobTitle') as string) || undefined,
        email: (formData.get('email') as string) || undefined,
        phone: (formData.get('phone') as string) || undefined,
        linkedin: (formData.get('linkedin') as string) || undefined,
        notes: (formData.get('notes') as string) || undefined,
      }

      const result =
        mode === 'create'
          ? await createContactAction(data)
          : await updateContactAction(contact!.id, data)

      if (result.success) {
        if (mode === 'create' && 'id' in result && result.id) {
          router.push(`/contacts/${result.id}`)
        } else {
          router.push(`/contacts/${contact!.id}`)
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-2">
                Prénom *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                defaultValue={contact?.firstName}
                required
                className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium mb-2">
                Nom *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                defaultValue={contact?.lastName}
                required
                className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* Company */}
          <div>
            <label htmlFor="companyId" className="block text-sm font-medium mb-2">
              Entreprise
            </label>
            <select
              id="companyId"
              name="companyId"
              defaultValue={contact?.companyId || defaultCompanyId || ''}
              className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Aucune</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {/* Job Title */}
          <div>
            <label htmlFor="jobTitle" className="block text-sm font-medium mb-2">
              Fonction
            </label>
            <input
              type="text"
              id="jobTitle"
              name="jobTitle"
              defaultValue={contact?.jobTitle || ''}
              className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                defaultValue={contact?.email || ''}
                className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                defaultValue={contact?.phone || ''}
                className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* LinkedIn */}
          <div>
            <label htmlFor="linkedin" className="block text-sm font-medium mb-2">
              LinkedIn
            </label>
            <input
              type="url"
              id="linkedin"
              name="linkedin"
              defaultValue={contact?.linkedin || ''}
              placeholder="https://linkedin.com/in/..."
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
              rows={4}
              defaultValue={contact?.notes || ''}
              className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? 'Enregistrement...'
            : mode === 'create'
              ? 'Créer le contact'
              : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
