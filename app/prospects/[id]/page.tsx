// Prospect/Opportunity detail page with Timeline (Phase 2)

import {
  getOpportunityById,
  getCompanyById,
  getContactById,
  getBusinessLineById,
  getActivities,
  getTasks,
  getStageHistory,
} from '@/lib/airtable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionLabel } from '@/components/ui/section-label'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TaskActions } from './task-actions'
import {
  getFrenchTaskType,
  getFrenchActivityType,
  getFrenchPriority,
} from '@/lib/utils/french-labels'

interface ProspectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProspectPage({ params }: ProspectPageProps) {
  const { id } = await params

  try {
    const opportunity = await getOpportunityById(id)

    const [businessLine, company, contact, activities, tasks, stageHistory] =
      await Promise.all([
        getBusinessLineById(opportunity.businessLineId),
        opportunity.companyId
          ? getCompanyById(opportunity.companyId).catch(() => null)
          : Promise.resolve(null),
        opportunity.primaryContactId
          ? getContactById(opportunity.primaryContactId).catch(() => null)
          : Promise.resolve(null),
        getActivities({ opportunityId: id }),
        getTasks({ opportunityId: id }),
        getStageHistory({ opportunityId: id }),
      ])

    // Find next TODO task
    const nextTask = tasks
      .filter((t) => t.status === 'TODO')
      .sort((a, b) => {
        if (!a.dueAt) return 1
        if (!b.dueAt) return -1
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      })[0]

    // Combine timeline items
    const timelineItems = [
      ...activities.map((a) => ({ ...a, type: 'activity' as const })),
      ...tasks.map((t) => ({ ...t, type: 'task' as const })),
      ...stageHistory.map((s) => ({ ...s, type: 'stage' as const })),
    ].sort(
      (a, b) =>
        new Date(
          'changedAt' in a
            ? a.changedAt
            : 'date' in a
              ? a.date
              : a.createdAt
        ).getTime() -
        new Date(
          'changedAt' in b
            ? b.changedAt
            : 'date' in b
              ? b.date
              : b.createdAt
        ).getTime()
    )
    timelineItems.reverse()

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/prospects"
                className="text-text-muted hover:text-text-primary text-sm"
              >
                ← Prospects
              </Link>
            </div>
            <h1 className="text-4xl font-bold font-syne">{opportunity.name}</h1>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Badge variant="default">{opportunity.stage}</Badge>
              <Badge variant="accent">{businessLine.name}</Badge>
              {opportunity.priority && <Badge>{opportunity.priority}</Badge>}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href={`/prospects/${id}/edit`}>
              <Button variant="ghost" size="sm">
                Modifier
              </Button>
            </Link>
            <Link href={`/prospects/${id}/activity`}>
              <Button size="sm">+ Activité</Button>
            </Link>
            <Link href={`/prospects/${id}/task`}>
              <Button size="sm" variant="ghost">
                + Tâche
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column - Info */}
          <div className="space-y-6">
            {/* Opportunity Info */}
            <Card>
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

                {contact && (
                  <div>
                    <div className="text-text-muted text-xs mb-1">Contact</div>
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="text-accent hover:underline"
                    >
                      {contact.firstName} {contact.lastName}
                    </Link>
                    {contact.jobTitle && (
                      <div className="text-text-muted text-xs mt-1">
                        {contact.jobTitle}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <div className="text-text-muted text-xs mb-1">Business Line</div>
                  <div className="text-sm">{businessLine.name}</div>
                </div>

                <div>
                  <div className="text-text-muted text-xs mb-1">Owner</div>
                  <div className="text-sm">{opportunity.owner}</div>
                </div>

                {opportunity.source && (
                  <div>
                    <div className="text-text-muted text-xs mb-1">Source</div>
                    <div className="text-sm">{opportunity.source}</div>
                  </div>
                )}

                {opportunity.potentialValue && (
                  <div>
                    <div className="text-text-muted text-xs mb-1">
                      Valeur potentielle
                    </div>
                    <div className="text-lg font-semibold">
                      {opportunity.potentialValue.toLocaleString('fr-FR')} €
                    </div>
                  </div>
                )}

                {opportunity.probability && (
                  <div>
                    <div className="text-text-muted text-xs mb-1">Probabilité</div>
                    <div className="text-sm">{opportunity.probability}%</div>
                  </div>
                )}

                {opportunity.expectedCloseDate && (
                  <div>
                    <div className="text-text-muted text-xs mb-1">
                      Date de closing estimée
                    </div>
                    <div className="text-sm">
                      {new Date(opportunity.expectedCloseDate).toLocaleDateString(
                        'fr-FR'
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next Action */}
            {nextTask && (
              <Card className="border-accent/30 bg-accent/5">
                <CardHeader>
                  <CardTitle className="text-lg">Prochaine action</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="font-medium">
                    {getFrenchTaskType(nextTask.type)}
                  </div>
                  {nextTask.dueAt && (
                    <div className="text-sm text-text-muted">
                      Échéance :{' '}
                      {new Date(nextTask.dueAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {' à '}
                      {new Date(nextTask.dueAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  )}
                  {nextTask.notes && (
                    <div className="text-sm">{nextTask.notes}</div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Problem / Need */}
            {(opportunity.problem || opportunity.need) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contexte</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {opportunity.problem && (
                    <div>
                      <div className="text-text-muted text-xs mb-1">Problème</div>
                      <div className="text-sm whitespace-pre-wrap">
                        {opportunity.problem}
                      </div>
                    </div>
                  )}
                  {opportunity.need && (
                    <div>
                      <div className="text-text-muted text-xs mb-1">Besoin</div>
                      <div className="text-sm whitespace-pre-wrap">
                        {opportunity.need}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column - Timeline */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {timelineItems.length === 0 ? (
                  <p className="text-text-muted text-sm">Aucune activité</p>
                ) : (
                  <div className="space-y-4">
                    {timelineItems.map((item, index) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="flex gap-4 pb-4 border-b border-border last:border-0"
                      >
                        <div className="flex-shrink-0 w-16 text-text-muted text-xs">
                          {new Date(
                            'changedAt' in item
                              ? item.changedAt
                              : 'date' in item
                                ? item.date
                                : item.createdAt
                          ).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </div>

                        <div className="flex-1 space-y-1">
                          {item.type === 'activity' && (
                            <>
                              <div className="flex items-center gap-2">
                                <Badge variant="muted">
                                  {getFrenchActivityType(item.type as any)}
                                </Badge>
                                <span className="font-medium text-sm">
                                  {item.owner}
                                </span>
                              </div>
                              {item.result && (
                                <div className="text-sm text-text-muted">
                                  Résultat : {item.result}
                                </div>
                              )}
                              {item.notes && (
                                <div className="text-sm">{item.notes}</div>
                              )}
                            </>
                          )}

                          {item.type === 'task' && (
                            <>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    item.status === 'TODO' ? 'accent' : 'muted'
                                  }
                                >
                                  {item.status}
                                </Badge>
                                <span className="font-medium text-sm">
                                  {getFrenchTaskType(item.type as any)}
                                </span>
                              </div>
                              {item.dueAt && item.status === 'TODO' && (
                                <div className="text-xs text-text-muted">
                                  Échéance :{' '}
                                  {new Date(item.dueAt).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                  {' à '}
                                  {new Date(item.dueAt).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              )}
                              {item.notes && (
                                <div className="text-sm">{item.notes}</div>
                              )}
                              <TaskActions taskId={item.id} status={item.status} />
                            </>
                          )}

                          {item.type === 'stage' && (
                            <>
                              <div className="flex items-center gap-2">
                                <Badge variant="default">Changement d'étape</Badge>
                                <span className="text-sm text-text-muted">
                                  {item.changedBy}
                                </span>
                              </div>
                              <div className="text-sm">
                                {item.fromStage || '—'} → {item.toStage}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
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
