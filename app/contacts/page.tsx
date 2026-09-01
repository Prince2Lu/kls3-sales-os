// Contacts list page (Phase 2)

import { getContacts } from '@/lib/airtable'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function ContactsPage() {
  const contacts = await getContacts({ maxRecords: 200 })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-syne">Contacts</h1>
          <p className="text-text-muted mt-2">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/contacts/new">
          <Button>+ Nouveau contact</Button>
        </Link>
      </div>

      {contacts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <p className="text-text-muted text-lg">Aucun contact pour le moment</p>
            <Link href="/contacts/new">
              <Button>Créer le premier contact</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => (
            <Link key={contact.id} href={`/contacts/${contact.id}`}>
              <Card className="hover:border-accent/50 transition-all cursor-pointer">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">
                    {contact.firstName} {contact.lastName}
                  </h3>
                  {contact.jobTitle && (
                    <p className="text-text-muted text-sm">{contact.jobTitle}</p>
                  )}
                  <div className="space-y-1 text-xs text-text-muted">
                    {contact.email && <div>{contact.email}</div>}
                    {contact.phone && <div>{contact.phone}</div>}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
