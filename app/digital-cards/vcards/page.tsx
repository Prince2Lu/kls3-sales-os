import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listDigitalCards } from '@/lib/digital-cards'

export const dynamic = 'force-dynamic'

export default async function VCardsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const cards = await listDigitalCards()

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">vCards</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Téléchargez directement les fiches contact associées aux cartes de visite KLS3.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <div key={card.slug} className="rounded-xl border border-border bg-card p-5">
            <div>
              <p className="font-medium">{card.displayName}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {[card.title, card.company].filter(Boolean).join(' · ') || 'KLS3'}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={`/api/public-cards/${encodeURIComponent(card.slug)}/vcard`}
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Télécharger la vCard
              </a>
              <a
                href={`https://www.kls3-dev.com/carte/${encodeURIComponent(card.slug)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium"
              >
                Voir la carte publique
              </a>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
