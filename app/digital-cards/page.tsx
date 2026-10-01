import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listDigitalCards } from '@/lib/digital-cards'
import { DigitalCardEditor } from './digital-card-editor'

export const dynamic = 'force-dynamic'

export default async function DigitalCardsPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  const cards = await listDigitalCards()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-syne">Cartes de visite</h1>
        <p className="mt-2 text-muted-foreground">
          Modifiez les informations sans changer le QR code déjà diffusé.
        </p>
      </div>

      <div className="space-y-10">
        {cards.map((card) => (
          <div key={card.id} className="space-y-3">
            <h2 className="text-2xl font-semibold">{card.displayName || card.slug}</h2>
            <DigitalCardEditor initialCard={card} />
          </div>
        ))}
      </div>
    </div>
  )
}
