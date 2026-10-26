// Company detail page (Phase 2)

import {
  getCompanyById,
  getContacts,
  getOpportunities,
  getBusinessLines,
  getColdCallTargets,
  getActivities,
  getTasks,
} from '@/lib/airtable'
import { loadCompanyRelationships } from '@/app/relationships/actions'
import { RelationshipCard } from '@/components/relationships/relationship-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionLabel } from '@/components/ui/section-label'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { AddToProspectingButton } from './add-to-prospecting-button'
import { CompanyContactSalesActions } from './company-contact-sales-actions'
import { ContactWorkActions } from '@/components/crm/contact-work-actions'
import { EditActivityButton } from '@/components/crm/edit-activity-button'
import { CompanyTaskActions } from './company-task-actions'
import { getFrenchActivityType, getFrenchTaskType, getFrenchPriority } from '@/lib/utils/french-labels'

interface CompanyPageProps {
  params: Promise<{ id: string }>
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { id } = await params

  try {
    const company = await getCompanyById(id)
    const [
      contacts,
      opportunities,
      businessLines,
      currentOwner,
      relationshipsResult,
      prospectingTargets,
      activities,
      tasks,
    ] = await Promise.all([
      getContacts({ companyId: id }),
      getOpportunities({ companyId: id }),
      getBusinessLines(),
      getCurrentOwner(),
      loadCompanyRelationships(id),
      getColdCallTargets({ maxRecords: 500, includeArchived: true }),
      getActivities(),
      getTasks(),
    ])

    const activeProspectingStatuses = new Set([
      'À appeler',
      'À rappeler',
      'Email Flow',
      'Échange',
      'Qualifié',
      'Mauvais numéro',
      'Pas intéressé',
    ])

    const allCompanyProspectingTargets = prospectingTargets.filter(
      (target) => target.companyId === id
    )

    const companyProspectingTargets = allCompanyProspectingTargets.filter(
      (target) => activeProspectingStatuses.has(target.callStatus) && !target.archived
    )

    const contactIds = new Set(contacts.map((contact) => contact.id))
    const targetIds = new Set(allCompanyProspectingTargets.map((target) => target.id))
    const opportunityIds = new Set(opportunities.map((opportunity) => opportunity.id))

    const companyActivities = activities
      .filter(
        (activity) =>
          (activity.contactId && contactIds.has(activity.contactId)) ||
          (activity.coldCallTargetId && targetIds.has(activity.coldCallTargetId)) ||
          (activity.opportunityId && opportunityIds.has(activity.opportunityId))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const companyTasks = tasks
      .filter(
        (task) =>
          (task.contactId && contactIds.has(task.contactId)) ||
          (task.coldCallTargetId && targetIds.has(task.coldCallTargetId)) ||
          (task.opportunityId && opportunityIds.has(task.opportunityId))
      )
      .sort((a, b) => {
        if (a.status === 'TODO' && b.status !== 'TODO') return -1
        if (a.status !== 'TODO' && b.status === 'TODO') return 1
        if (!a.dueAt && !b.dueAt) return 0
        if (!a.dueAt) return 1
        if (!b.dueAt) return -1
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      })

    const contactById = new Map(
      contacts.map((contact) => [contact.id, contact] as const)
    )

    const relationships = relationshipsResult.success ? relationshipsResult.data : []

    const primaryBusinessLine = company.primaryBusinessLineId
      ? businessLines.find((bl) => bl.id === company.primaryBusinessLineId)
      : null

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/companies"
                className="text-text-muted hover:text-text-primary text-sm"
              >
                ← Entreprises
              </Link>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold font-syne break-words">{company.name}</h1>
            {company.industry && (
              <p className="text-text-muted mt-2 text-lg">{company.industry}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <ContactWorkActions contacts={contacts} />
            <AddToProspectingButton
              companyId={company.id}
              companyName={company.name}
              contacts={contacts}
              businessLines={businessLines}
              currentOwner={currentOwner}
            />
            <Link href={`/companies/${id}/edit`}>
              <Button variant="ghost">Modifier</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Company Info */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-text-muted text-xs mb-1">Business Line</div>
                {primaryBusinessLine ? (
                  <Badge variant="accent">{primaryBusinessLine.name}</Badge>
                ) : (
                  <div className="text-sm text-text-muted">
                    Aucune Business Line
                  </div>
                )}
              </div>

              {company.website && (
                <div>
                  <div className="text-text-muted text-xs mb-1">Site web</div>
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline text-sm break-all"
                  >
                    {company.website}
                  </a>
                </div>
              )}

              {(company.addressLine1 ||
                company.addressLine2 ||
                company.postalCode ||
                company.city ||
                company.country) && (
                <div>
                  <div className="text-text-muted text-xs mb-1">Adresse</div>
                  <div className="text-sm space-y-0.5">
                    {company.addressLine1 && <div>{company.addressLine1}</div>}
                    {company.addressLine2 && <div>{company.addressLine2}</div>}
                    {(company.postalCode || company.city) && (
                      <div>
                        {company.postalCode} {company.city}
                      </div>
                    )}
                    {company.country && <div>{company.country}</div>}
                  </div>
                </div>
              )}

              {company.phone && (
                <div>
                  <div className="text-text-muted text-xs mb-1">Téléphone</div>
                  <div className="text-sm">{company.phone}</div>
                </div>
              )}

              {company.email && (
                <div>
                  <div className="text-text-muted text-xs mb-1">Email entreprise</div>
                  <a
                    href={`mailto:${company.email}`}
                    className="text-accent hover:underline text-sm break-all"
                  >
                    {company.email}
                  </a>
                </div>
              )}

              {(company.vatNumber ||
                company.intraCommunityVatNumber ||
                company.registryNumber) && (
                <div className="space-y-3 pt-1">
                  <div className="text-sm font-semibold">Identification légale</div>

                  {company.vatNumber && (
                    <div>
                      <div className="text-text-muted text-xs mb-1">N° TVA</div>
                      <div className="text-sm break-all">{company.vatNumber}</div>
                    </div>
                  )}

                  {company.intraCommunityVatNumber && (
                    <div>
                      <div className="text-text-muted text-xs mb-1">
                        TVA intracommunautaire
                      </div>
                      <div className="text-sm break-all">
                        {company.intraCommunityVatNumber}
                      </div>
                    </div>
                  )}

                  {company.registryNumber && (
                    <div>
                      <div className="text-text-muted text-xs mb-1">
                        N° de registre (SIREN, RCS…)
                      </div>
                      <div className="text-sm break-all">{company.registryNumber}</div>
                    </div>
                  )}
                </div>
              )}

              {company.companySize && (
                <div>
                  <div className="text-text-muted text-xs mb-1">Taille</div>
                  <div className="text-sm">{company.companySize}</div>
                </div>
              )}

              {company.linkedin && (
                <div>
                  <div className="text-text-muted text-xs mb-1">LinkedIn</div>
                  <a
                    href={company.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline text-sm"
                  >
                    Voir le profil
                  </a>
                </div>
              )}

              {company.notes && (
                <div>
                  <div className="text-text-muted text-xs mb-1">Notes</div>
                  <div className="text-sm whitespace-pre-wrap">{company.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contacts and Opportunities */}
          <div className="lg:col-span-2 space-y-6">
            {/* Relationships */}
            {relationships.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">
                    Relations stratégiques ({relationships.length})
                  </CardTitle>
                  <Link href={`/relationships/new?companyId=${id}`}>
                    <Button size="sm" variant="ghost">
                      + Créer
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {relationships.map((relationship) => (
                      <RelationshipCard
                        key={relationship.id}
                        relationship={relationship}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contacts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  Contacts ({contacts.length})
                </CardTitle>
                <Link href={`/contacts/new?companyId=${id}`}>
                  <Button size="sm" variant="ghost">
                    + Ajouter
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {contacts.length === 0 ? (
                  <p className="text-text-muted text-sm">Aucun contact</p>
                ) : (
                  <div className="space-y-3">
                    {contacts.map((contact) => {
                      const target =
                        companyProspectingTargets.find(
                          (item) => item.contactId === contact.id
                        ) || null

                      const contactActivities = activities.filter(
                        (activity) =>
                          activity.contactId === contact.id ||
                          (target && activity.coldCallTargetId === target.id)
                      )

                      const contactTasks = tasks.filter(
                        (task) =>
                          task.contactId === contact.id ||
                          (target && task.coldCallTargetId === target.id)
                      )

                      return (
                        <div
                          key={contact.id}
                          className="p-3 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <Link
                                href={`/contacts/${contact.id}`}
                                className="font-medium hover:text-accent transition-colors"
                              >
                                {contact.firstName} {contact.lastName}
                              </Link>
                              {contact.jobTitle && (
                                <div className="text-text-muted text-sm">
                                  {contact.jobTitle}
                                </div>
                              )}
                              {(contact.email || company.email) && (
                                <div className="text-xs">
                                  <a
                                    href={`mailto:${contact.email || company.email}`}
                                    className="text-text-muted hover:text-accent break-all"
                                  >
                                    {contact.email || company.email}
                                  </a>
                                  {!contact.email && company.email && (
                                    <span className="text-text-muted ml-1">· entreprise</span>
                                  )}
                                </div>
                              )}
                            </div>

                            <CompanyContactSalesActions
                              company={company}
                              contact={contact}
                              target={target}
                              businessLines={businessLines}
                              currentOwner={currentOwner}
                              activities={contactActivities}
                              tasks={contactTasks}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CRM Activity History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Activités récentes ({companyActivities.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {companyActivities.length === 0 ? (
                  <p className="text-text-muted text-sm">Aucune activité</p>
                ) : (
                  <div className="space-y-3">
                    {companyActivities.slice(0, 20).map((activity) => {
                      const activityContact = activity.contactId
                        ? contactById.get(activity.contactId)
                        : null

                      return (
                        <div
                          key={activity.id}
                          className="p-3 rounded-lg border border-border bg-white/[0.02] space-y-1"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <Badge variant="muted">
                              {getFrenchActivityType(activity.type)}
                            </Badge>
                            {activity.result && (
                              <Badge variant="default">{activity.result}</Badge>
                            )}
                            <span className="text-text-muted text-xs">
                              {new Date(activity.date).toLocaleString('fr-FR', {
                                timeZone: 'Europe/Paris',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span className="text-text-muted text-xs">
                              · {activity.owner}
                            </span>
                          </div>

                          {activityContact && (
                            <Link
                              href={`/contacts/${activityContact.id}`}
                              className="text-accent hover:underline text-sm"
                            >
                              {activityContact.firstName} {activityContact.lastName}
                            </Link>
                          )}

                          <EditActivityButton activity={activity} />
                          {activity.notes && (
                            <div className="text-sm whitespace-pre-wrap">
                              {activity.notes}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {companyActivities.length > 20 && (
                      <p className="text-xs text-text-muted">
                        20 activités les plus récentes affichées.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Company Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Tâches ({companyTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {companyTasks.length === 0 ? (
                  <p className="text-text-muted text-sm">Aucune tâche</p>
                ) : (
                  <div className="space-y-3">
                    {companyTasks.map((task) => {
                      const taskContact = task.contactId
                        ? contactById.get(task.contactId)
                        : null

                      return (
                        <div
                          key={task.id}
                          className="p-3 rounded-lg border border-border bg-white/[0.02] space-y-2"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={task.status === 'TODO' ? 'accent' : 'muted'}>
                                {task.status === 'TODO' ? 'À faire' : task.status}
                              </Badge>
                              <span className="text-sm font-medium">
                                {getFrenchTaskType(task.type)}
                              </span>
                              {task.priority && (
                                <span className="text-xs text-text-muted">
                                  · {getFrenchPriority(task.priority)}
                                </span>
                              )}
                            </div>

                            {task.status === 'TODO' && (
                              <CompanyTaskActions
                                taskId={task.id}
                                companyId={company.id}
                              />
                            )}
                          </div>

                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
                            {taskContact && (
                              <Link
                                href={`/contacts/${taskContact.id}`}
                                className="text-accent hover:underline"
                              >
                                {taskContact.firstName} {taskContact.lastName}
                              </Link>
                            )}
                            {task.dueAt && (
                              <span>
                                Échéance :{' '}
                                {new Date(task.dueAt).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                            <span>· {task.owner}</span>
                          </div>

                          {task.notes && (
                            <div className="text-sm whitespace-pre-wrap">{task.notes}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Opportunities */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  Opportunités ({opportunities.length})
                </CardTitle>
                <Link href={`/prospects/new?companyId=${id}`}>
                  <Button size="sm" variant="ghost">
                    + Créer
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {opportunities.length === 0 ? (
                  <p className="text-text-muted text-sm">Aucune opportunité</p>
                ) : (
                  <div className="space-y-3">
                    {opportunities.map((opportunity) => (
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
                                  {opportunity.potentialValue}€
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
          </div>
        </div>
      </div>
    )
  } catch (error) {
    notFound()
  }
}
