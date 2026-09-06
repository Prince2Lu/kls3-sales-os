import { notFound } from 'next/navigation'
import { getContactById, getCompanies } from '@/lib/airtable'
import { ContactForm } from '../../contact-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditContactPage({ params }: PageProps) {
  const { id } = await params

  let contact
  try {
    contact = await getContactById(id)
  } catch (error) {
    console.error('Error fetching contact:', error)
    notFound()
  }

  const companies = await getCompanies({ maxRecords: 500 })

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          Modifier le contact
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {contact.firstName} {contact.lastName}
        </p>
      </div>

      <ContactForm companies={companies} contact={contact} mode="edit" />
    </div>
  )
}
