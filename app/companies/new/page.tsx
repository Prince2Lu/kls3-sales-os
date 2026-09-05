// Create new company page

import { getBusinessLines } from '@/lib/airtable'
import { CompanyForm } from '../company-form'

export default async function NewCompanyPage() {
  const businessLines = await getBusinessLines()

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-syne">Nouvelle entreprise</h1>
        <p className="text-text-muted mt-2">
          Créer une nouvelle entreprise dans le CRM
        </p>
      </div>

      <CompanyForm businessLines={businessLines} mode="create" />
    </div>
  )
}
