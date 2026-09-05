'use client'

// Company creation/edit form

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Company, BusinessLine } from '@/types/domain'
import { createCompanyAction, updateCompanyAction } from './actions'

interface CompanyFormProps {
  company?: Company
  businessLines: BusinessLine[]
  mode?: 'create' | 'edit'
}

export function CompanyForm({ company, businessLines, mode = 'create' }: CompanyFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setError(null)

    const data = {
      name: formData.get('name') as string,
      primaryBusinessLineId: (formData.get('primaryBusinessLineId') as string) || undefined,
      website: (formData.get('website') as string) || undefined,
      industry: (formData.get('industry') as string) || undefined,
      addressLine1: (formData.get('addressLine1') as string) || undefined,
      addressLine2: (formData.get('addressLine2') as string) || undefined,
      postalCode: (formData.get('postalCode') as string) || undefined,
      city: (formData.get('city') as string) || undefined,
      country: (formData.get('country') as string) || undefined,
      phone: (formData.get('phone') as string) || undefined,
      companySize: (formData.get('companySize') as string) || undefined,
      linkedin: (formData.get('linkedin') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined,
    }

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createCompanyAction(data)
          : await updateCompanyAction(company!.id, data)

      if (result.success) {
        router.push('/companies')
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

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations de l'entreprise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Nom de l'entreprise <span className="text-red-500">*</span>
            </label>
            <Input
              name="name"
              required
              defaultValue={company?.name}
              placeholder="Ex: Acme Corporation"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Business Line <span className="text-red-500">*</span>
            </label>
            <select
              name="primaryBusinessLineId"
              required
              defaultValue={company?.primaryBusinessLineId || ''}
              className="w-full px-3 py-2 bg-card-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Sélectionner une Business Line</option>
              {businessLines.map((bl) => (
                <option key={bl.id} value={bl.id}>
                  {bl.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Site web</label>
              <Input
                name="website"
                type="url"
                defaultValue={company?.website || ''}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Secteur</label>
              <Input
                name="industry"
                defaultValue={company?.industry || ''}
                placeholder="Ex: SaaS, Conseil, etc."
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Adresse</label>
            <Input
              name="addressLine1"
              defaultValue={company?.addressLine1 || ''}
              placeholder="Ex: 123 rue de la Paix"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Complément d'adresse</label>
            <Input
              name="addressLine2"
              defaultValue={company?.addressLine2 || ''}
              placeholder="Bâtiment, étage, etc. (optionnel)"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Code postal</label>
              <Input
                name="postalCode"
                defaultValue={company?.postalCode || ''}
                placeholder="Ex: 75001"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Ville</label>
              <Input
                name="city"
                defaultValue={company?.city || ''}
                placeholder="Ex: Paris"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Pays</label>
              <Input
                name="country"
                defaultValue={company?.country || ''}
                placeholder="Ex: France"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Téléphone</label>
              <Input
                name="phone"
                type="tel"
                defaultValue={company?.phone || ''}
                placeholder="+33 1 23 45 67 89"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Taille</label>
              <Input
                name="companySize"
                defaultValue={company?.companySize || ''}
                placeholder="Ex: 50-200 employés"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">LinkedIn</label>
            <Input
              name="linkedin"
              type="url"
              defaultValue={company?.linkedin || ''}
              placeholder="https://linkedin.com/company/..."
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Notes</label>
            <Textarea
              name="notes"
              defaultValue={company?.notes || ''}
              placeholder="Notes internes sur l'entreprise..."
              rows={4}
            />
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
              ? "Créer l'entreprise"
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
