// Contact creation page (Phase 2.5 bugfix)

import { getCompanies } from '@/lib/airtable'
import { ContactForm } from '../contact-form'
import Link from 'next/link'

interface NewContactPageProps {
  searchParams: Promise<{ companyId?: string }>
}

export default async function NewContactPage({
  searchParams,
}: NewContactPageProps) {
  const params = await searchParams
  const companies = await getCompanies({ maxRecords: 500 })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/contacts"
          className="text-text-muted hover:text-text-primary text-sm"
        >
          ← Contacts
        </Link>
        <h1 className="text-4xl font-bold font-syne mt-2">Nouveau contact</h1>
      </div>

      <ContactForm
        companies={companies}
        defaultCompanyId={params.companyId}
        mode="create"
      />
    </div>
  )
}
