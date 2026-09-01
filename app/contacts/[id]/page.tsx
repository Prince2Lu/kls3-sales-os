// Contact detail page (Phase 2.5)

import {
  getContactById,
  getCompanyById,
  getOpportunities,
  getActivities,
  getTasks,
} from '@/lib/airtable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface ContactPageProps {
  params: Promise<{ id: string }>
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { id } = await params

  try {
    const contact = await getContactById(id)

    const [company, opportunities, activities, tasks] = await Promise.all([
      contact.companyId
        ? getCompanyById(contact.companyId).catch(() => null)
        : Promise.resolve(null),
      getOpportunities({ maxRecords: 100 }),
      getActivities({ contactId: id }),
      getTasks({ contactId: id, status: 'TODO' }),
    ])

    // Filter opportunities related to this contact
    const contactOpportunities = opportunities.filter(
      (opp) => opp.primaryContactId === id
    )

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/contacts"
                className="text-text-muted hover:text-text-primary text-sm"
              >
                ← Contacts
              </Link>
            </div>
            <h1 className="text-4xl font-bold font-syne">
              {contact.firstName} {contact.lastName}
            </h1>
            {contact.jobTitle && (
              <p className="text-text-muted mt-2 text-lg">{contact.jobTitle}</p>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contact Info */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {company && (
                <div>
                  <div className="text-text-muted text-xs mb-1">Entreprise</div>
                  <Link
                    href={`/companies/${company.id}`}
                    className="text-accent hover:underline"
                  >
                    {company.name}
                  </Link>
                </div>
              )}

              {contact.email && (
                <div>
                  <div className="text-text-muted text-xs mb-1">Email</div>
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-accent hover:underline text-sm"
                  >
                    {contact.email}
                  </a>
                </div>
              )}

              {contact.phone && (
                <div>
                  <div className="text-text-muted text-xs mb-1">Téléphone</div>
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-accent hover:underline text-sm"
                  >
                    {contact.phone}
                  </a>
                </div>
              )}

              {contact.linkedin && (
                <div>
                  <div className="text-text-muted text-xs mb-1">LinkedIn</div>
                  <a
                    href={contact.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline text-sm"
                  >
                    Voir le profil
                  </a>
                </div>
              )}

              {contact.notes && (
                <div>
                  <div className="text-text-muted text-xs mb-1">Notes</div>
                  <div className="text-sm whitespace-pre-wrap">{contact.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Opportunities and Activities */}
          <div className="lg:col-span-2 space-y-6">
            {/* Opportunities */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  Opportunités ({contactOpportunities.length})
                </CardTitle>
                <Link href={`/prospects/new?contactId=${id}`}>
                  <Button size="sm" variant="ghost">
                    + Créer
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {contactOpportunities.length === 0 ? (
                  <p className="text-text-muted text-sm">Aucune opportunité</p>
                ) : (
                  <div className="space-y-3">
                    {contactOpportunities.map((opportunity) => (
                      <Link
                        key={opportunity.id}
                        href={`/prospects/${opportunity.id}`}
                        className="block p-3 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{opportunity.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="default">{opportunity.stage}</Badge>
                              {opportunity.potentialValue && (
                                <span className="text-text-muted text-sm">
                                  {opportunity.potentialValue.toLocaleString('fr-FR')}€
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Activités récentes ({activities.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-text-muted text-sm">Aucune activité</p>
                ) : (
                  <div className="space-y-3">
                    {activities.slice(0, 10).map((activity) => (
                      <div
                        key={activity.id}
                        className="p-3 rounded-lg bg-white/5 space-y-1"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="muted">{activity.type}</Badge>
                          <span className="text-text-muted">
                            {new Date(activity.date).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        {activity.result && (
                          <div className="text-sm text-text-muted">
                            Résultat : {activity.result}
                          </div>
                        )}
                        {activity.notes && (
                          <div className="text-sm">{activity.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Open Tasks */}
            {tasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Tâches à faire ({tasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 rounded-lg border border-accent/30 bg-accent/5 space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="accent">{task.type}</Badge>
                          {task.dueAt && (
                            <span className="text-sm text-text-muted">
                              {new Date(task.dueAt).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                        {task.notes && <div className="text-sm">{task.notes}</div>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    )
  } catch (error) {
    notFound()
  }
}
