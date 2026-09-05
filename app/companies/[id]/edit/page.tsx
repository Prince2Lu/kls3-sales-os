import { notFound } from 'next/navigation'
import { getCompanyById, getBusinessLines } from '@/lib/airtable'
import { CompanyForm } from '../../company-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditCompanyPage({ params }: PageProps) {
  const { id } = await params

  let company
  try {
    company = await getCompanyById(id)
  } catch (error) {
    console.error('Error fetching company:', error)
    notFound()
  }

  const businessLines = await getBusinessLines()

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          Modifier l'entreprise
        </h1>
        <p className="text-sm text-text-muted mt-1">{company.name}</p>
      </div>

      <CompanyForm company={company} businessLines={businessLines} mode="edit" />
    </div>
  )
}
