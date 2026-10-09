import Link from 'next/link'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listDigitalCards } from '@/lib/digital-cards'
import { getCompanies, getContacts, getEmailRecipients } from '@/lib/airtable'
import { listDirectEmails } from '@/lib/direct-email/data'
import { listCardEvents, summarizeCardEvents } from '@/lib/card-analytics'

export const dynamic = 'force-dynamic'

const PERIODS = [
  { key: 'today', label: "Aujourd'hui", days: 0 },
  { key: '7', label: '7 jours', days: 7 },
  { key: '30', label: '30 jours', days: 30 },
  { key: 'all', label: 'Total', days: null },
] as const

function startForPeriod(period: string) {
  const selected = PERIODS.find((item) => item.key === period) || PERIODS[2]
  if (selected.days === null) return null

  const now = new Date()
  if (selected.days === 0) {
    now.setHours(0, 0, 0, 0)
    return now
  }

  now.setDate(now.getDate() - selected.days)
  return now
}

function fmtDate(value: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function pct(value: number) {
  return `${value}%`
}

function Stat({
  label,
  value,
  helper,
}: {
  label: string
  value: string | number
  helper?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      {helper && <div className="mt-1 text-xs text-muted-foreground">{helper}</div>}
    </div>
  )
}

export default async function CardStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; card?: string }>
}) {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  const params = await searchParams
  const period = params.period || '30'
  const selectedCard = params.card || 'all'
  const start = startForPeriod(period)

  const [cards, allEvents, recipients, directEmails, contacts, companies] = await Promise.all([
    listDigitalCards(),
    listCardEvents(),
    getEmailRecipients(),
    listDirectEmails(),
    getContacts({ maxRecords: 5000 }),
    getCompanies({ maxRecords: 2000 }),
  ])

  const recipientByRef = new Map(
    recipients
      .filter((recipient) => !!recipient.cardRef)
      .map((recipient) => [recipient.cardRef as string, recipient])
  )
  const directEmailByRef = new Map(
    directEmails
      .filter((item) => !!item.cardRef)
      .map((item) => [item.cardRef, item])
  )
  const contactById = new Map(contacts.map((contact) => [contact.id, contact]))
  const companyById = new Map(companies.map((company) => [company.id, company]))

  const identityFor = (cardRef: string) => {
    if (!cardRef) return null

    const directEmail = directEmailByRef.get(cardRef)
    if (directEmail) {
      const contact = directEmail.contactId ? contactById.get(directEmail.contactId) : null
      const company = directEmail.companyId ? companyById.get(directEmail.companyId) : null
      const name = contact
        ? [contact.firstName, contact.lastName].filter(Boolean).join(' ')
        : directEmail.toEmail
      return {
        name: name || directEmail.toEmail,
        company: company?.name || '',
        email: directEmail.toEmail,
      }
    }

    const recipient = recipientByRef.get(cardRef)
    if (!recipient) return null
    const contact = recipient.contactId ? contactById.get(recipient.contactId) : null
    const company = companyById.get(recipient.companyId)
    const name = contact
      ? [contact.firstName, contact.lastName].filter(Boolean).join(' ')
      : recipient.email
    return {
      name: name || recipient.email,
      company: company?.name || '',
      email: recipient.email,
    }
  }

  const events = allEvents.filter((event) => {
    const cardOk = selectedCard === 'all' || event.cardSlug === selectedCard
    const dateOk = !start || new Date(event.occurredAt) >= start
    return cardOk && dateOk
  })

  const stats = summarizeCardEvents(events)
  const identifiedContacts = new Set(
    events
      .map((event) => event.cardRef)
      .filter((ref) => !!ref && (recipientByRef.has(ref) || directEmailByRef.has(ref)))
  ).size
  const actionTotal =
    stats.vcardDownloads +
    stats.phoneClicks +
    stats.emailClicks +
    stats.linkedinClicks +
    stats.websiteClicks +
    stats.projectClicks

  const actionRows = [
    ['vCard téléchargée', stats.vcardDownloads],
    ['LinkedIn', stats.linkedinClicks],
    ['Site web', stats.websiteClicks],
    ['Email', stats.emailClicks],
    ['Téléphone', stats.phoneClicks],
    ['Projets', stats.projectClicks],
  ] as const

  const maxDaily = Math.max(1, ...stats.daily.map((day) => day.views + day.actions))

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold font-syne">Statistiques des cartes</h1>
          <p className="mt-2 text-muted-foreground">
            Suivez les consultations et les actions générées par chaque carte digitale.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PERIODS.map((item) => (
            <Link
              key={item.key}
              href={`/digital-cards/stats?period=${item.key}&card=${selectedCard}`}
              className={`rounded-lg border px-3 py-2 text-sm ${
                period === item.key
                  ? 'border-accent bg-accent text-white'
                  : 'border-border bg-card'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/digital-cards/stats?period=${period}&card=all`}
          className={`rounded-full border px-3 py-1.5 text-sm ${
            selectedCard === 'all' ? 'border-accent text-accent' : 'border-border'
          }`}
        >
          Toutes les cartes
        </Link>
        {cards.map((card) => (
          <Link
            key={card.slug}
            href={`/digital-cards/stats?period=${period}&card=${card.slug}`}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              selectedCard === card.slug ? 'border-accent text-accent' : 'border-border'
            }`}
          >
            {card.displayName || card.slug}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Stat label="Vues" value={stats.views} />
        <Stat label="Visiteurs uniques" value={stats.uniqueVisitors} />
        <Stat label="Actions" value={actionTotal} helper="Tous clics et téléchargements" />
        <Stat label="Taux d'engagement" value={pct(stats.engagementRate)} helper="Visiteurs ayant réalisé une action" />
        <Stat label="Taux d'enregistrement" value={pct(stats.saveRate)} helper="Téléchargements vCard / vues" />
        <Stat label="Contacts identifiés" value={identifiedContacts} helper="Via un lien personnalisé CRM / Brevo" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-xl font-semibold">Actions</h2>
          <div className="mt-5 space-y-4">
            {actionRows.map(([label, value]) => {
              const width = actionTotal ? Math.max(4, Math.round((value / actionTotal) * 100)) : 0
              return (
                <div key={label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${width}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-xl font-semibold">Sources</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Origine des interactions enregistrées.
          </p>
          <div className="mt-5 space-y-3">
            {stats.sources.length === 0 && (
              <div className="text-sm text-muted-foreground">Aucune donnée sur la période.</div>
            )}
            {stats.sources.slice(0, 10).map((source) => (
              <div key={source.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-sm">{source.name}</span>
                <span className="font-medium">{source.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xl font-semibold">Activité dans le temps</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Vues et actions enregistrées par jour.
        </p>

        <div className="mt-6 space-y-3">
          {stats.daily.length === 0 && (
            <div className="text-sm text-muted-foreground">Aucune donnée sur la période.</div>
          )}
          {stats.daily.slice(-30).map((day) => {
            const total = day.views + day.actions
            return (
              <div key={day.date} className="grid grid-cols-[90px_1fr_110px] items-center gap-3 text-sm">
                <span className="text-muted-foreground">
                  {new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(new Date(day.date))}
                </span>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.max(3, Math.round((total / maxDaily) * 100))}%` }}
                  />
                </div>
                <span className="text-right">
                  {day.views} vue{day.views > 1 ? 's' : ''} · {day.actions} action{day.actions > 1 ? 's' : ''}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {stats.projects.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-xl font-semibold">Projets les plus consultés</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {stats.projects.map((project) => (
              <div key={project.name} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <span>{project.name}</span>
                <span className="font-medium">{project.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xl font-semibold">Dernières interactions</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Carte</th>
                <th className="pb-3 font-medium">Contact</th>
                <th className="pb-3 font-medium">Événement</th>
                <th className="pb-3 font-medium">Source</th>
                <th className="pb-3 font-medium">Campagne</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((event) => {
                const identity = identityFor(event.cardRef)
                return (
                <tr key={event.id} className="border-b border-border/60">
                  <td className="py-3">{fmtDate(event.occurredAt)}</td>
                  <td className="py-3">{event.cardSlug}</td>
                  <td className="py-3">
                    {identity ? (
                      <div>
                        <div className="font-medium">{identity.name}</div>
                        <div className="text-xs text-muted-foreground">{identity.company || identity.email}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Anonyme</span>
                    )}
                  </td>
                  <td className="py-3">{event.eventType}</td>
                  <td className="py-3">{event.source || 'direct'}</td>
                  <td className="py-3">{event.campaign || '—'}</td>
                </tr>
                )
              })}
              {stats.recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground">
                    Aucune interaction enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
