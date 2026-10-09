import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getContactById } from '@/lib/airtable'
import { DirectEmailComposer } from './direct-email-composer'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { directMailConfigured } from '@/lib/direct-email/mailer'

export const dynamic = 'force-dynamic'

export default async function ContactEmailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const contact = await getContactById(id).catch(() => null)
  if (!contact) notFound()

  const owner = await getCurrentOwner()
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ')

  if (!contact.email) {
    return (
      <div className="space-y-6">
        <Link href={`/contacts/${id}`} className="text-sm text-accent hover:underline">← Retour au contact</Link>
        <div>
          <h1 className="text-4xl font-bold font-syne">Envoyer un mail</h1>
          <p className="mt-2 text-muted-foreground">Ce contact n’a pas d’adresse email directe renseignée.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/contacts/${id}`} className="text-sm text-accent hover:underline">← Retour au contact</Link>
        <h1 className="mt-3 text-4xl font-bold font-syne">Envoyer un mail</h1>
        <p className="mt-2 text-muted-foreground">
          Rédigez et envoyez un mail HTML depuis Sales OS avec pièces jointes et lien de carte personnalisé.
        </p>
      </div>

      <DirectEmailComposer
        contactId={id}
        contactName={name}
        email={contact.email}
        configured={await directMailConfigured(owner)}
      />
    </div>
  )
}
