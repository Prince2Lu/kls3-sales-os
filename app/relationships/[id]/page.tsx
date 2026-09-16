// Relationship detail page (Phase 2)

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { loadRelationshipDetail } from '../actions'

interface RelationshipPageProps {
  params: Promise<{ id: string }>
}

export default async function RelationshipPage({ params }: RelationshipPageProps) {
  const { id } = await params

  const result = await loadRelationshipDetail(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const { relationship, contact, company, activities, tasks, introducedOpportunities } = result.data

  // Filter open tasks
  const openTasks = tasks.filter(t => t.status === 'TODO')
  const overdueTasks = openTasks.filter(t => t.dueAt && new Date(t.dueAt) < new Date())

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/relationships"
              className="text-text-muted hover:text-text-primary text-sm"
            >
              ← Relations stratégiques
            </Link>
          </div>
          <h1 className="text-4xl font-bold font-syne">{relationship.name}</h1>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="default">{relationship.relationshipType}</Badge>
            <Badge
              variant={
                relationship.status === 'Actif'
                  ? 'default'
                  : relationship.status === 'Clos'
                  ? 'muted'
                  : 'accent'
              }
            >
              {relationship.status}
            </Badge>
            <Badge
              variant={
                relationship.importance === 'Haute'
                  ? 'accent'
                  : relationship.importance === 'Faible'
                  ? 'muted'
                  : 'default'
              }
            >
              {relationship.importance}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/relationships/${id}/edit`}>
            <Button variant="ghost">Modifier</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Summary */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Owner */}
            <div>
              <div className="text-text-muted text-xs mb-1">Responsable</div>
              <div className="text-sm">{relationship.owner}</div>
            </div>

            {/* Company */}
            {company && (
              <div>
                <div className="text-text-muted text-xs mb-1">Entreprise</div>
                <Link
                  href={`/companies/${company.id}`}
                  className="text-accent hover:underline text-sm"
                >
                  {company.name}
                </Link>
              </div>
            )}

            {/* Contact */}
            {contact && (
              <div>
                <div className="text-text-muted text-xs mb-1">Contact principal</div>
                <Link
                  href={`/contacts/${contact.id}`}
                  className="text-accent hover:underline text-sm"
                >
                  {contact.firstName} {contact.lastName}
                </Link>
                {contact.jobTitle && (
                  <div className="text-xs text-text-muted mt-1">{contact.jobTitle}</div>
                )}
              </div>
            )}

            {/* Objective */}
            {relationship.objective && (
              <div>
                <div className="text-text-muted text-xs mb-1">Objectif</div>
                <div className="text-sm whitespace-pre-wrap">{relationship.objective}</div>
              </div>
            )}

            {/* Notes */}
            {relationship.notes && (
              <div>
                <div className="text-text-muted text-xs mb-1">Notes</div>
                <div className="text-sm whitespace-pre-wrap">{relationship.notes}</div>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t border-border">
              <div className="text-text-muted text-xs mb-1">Créée le</div>
              <div className="text-sm">
                {new Date(relationship.createdAt).toLocaleDateString('fr-FR')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Interaction & Next Action */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Dernière interaction & Prochaine action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Last Interaction */}
            <div>
              <div className="text-sm font-medium mb-2">Dernière interaction</div>
              {relationship.lastInteraction ? (
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <span className="text-text-muted">
                      {new Date(relationship.lastInteraction).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  {(() => {
                    const lastActivity = activities
                      .filter(a => a.date === relationship.lastInteraction)
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

                    if (lastActivity) {
                      return (
                        <>
                          <Badge variant="muted" className="mb-2">{lastActivity.type}</Badge>
                          {lastActivity.result && (
                            <div className="text-sm text-text-muted">
                              Résultat : {lastActivity.result}
                            </div>
                          )}
                          {lastActivity.notes && (
                            <div className="text-sm mt-1">{lastActivity.notes}</div>
                          )}
                        </>
                      )
                    }
                    return null
                  })()}
                </div>
              ) : (
                <div className="text-text-muted text-sm p-3 rounded-lg bg-white/5">
                  Aucune activité enregistrée
                </div>
              )}
            </div>

            {/* Next Action */}
            <div>
              <div className="text-sm font-medium mb-2">Prochaine action</div>
              {relationship.nextActionTaskId ? (
                (() => {
                  const nextTask = tasks.find(t => t.id === relationship.nextActionTaskId)
                  if (!nextTask) return null

                  const isOverdue = nextTask.dueAt && new Date(nextTask.dueAt) < new Date()

                  return (
                    <div className={`p-3 rounded-lg border ${isOverdue ? 'border-red-500/30 bg-red-500/5' : 'border-accent/30 bg-accent/5'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={isOverdue ? 'muted' : 'accent'}>{nextTask.type}</Badge>
                        {nextTask.dueAt && (
                          <span className={`text-sm ${isOverdue ? 'text-red-500' : 'text-text-muted'}`}>
                            {isOverdue ? 'En retard - ' : ''}
                            {new Date(nextTask.dueAt).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                      {nextTask.notes && <div className="text-sm">{nextTask.notes}</div>}
                    </div>
                  )
                })()
              ) : (
                <div className="text-text-muted text-sm p-3 rounded-lg bg-white/5">
                  Aucune tâche planifiée
                  <div className="mt-2">
                    <Link href={`/prospects/new?relationshipId=${id}`}>
                      <Button size="sm" variant="ghost">+ Créer une tâche</Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Overdue tasks warning */}
            {overdueTasks.length > 0 && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50">
                <div className="text-sm text-red-500">
                  ⚠️ {overdueTasks.length} tâche{overdueTasks.length > 1 ? 's' : ''} en retard
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <div className="lg:col-span-3 space-y-6">
          {/* Introduced Opportunities */}
          {introducedOpportunities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Opportunités introduites ({introducedOpportunities.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {introducedOpportunities.map((opportunity) => (
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
              </CardContent>
            </Card>
          )}

          {/* Activities */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Activités ({activities.length})
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

          {/* Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Tâches ({tasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-text-muted text-sm">Aucune tâche</p>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => {
                    const isOverdue = task.dueAt && new Date(task.dueAt) < new Date()
                    const isDone = task.status === 'DONE'

                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-lg space-y-1 ${
                          isDone
                            ? 'bg-white/5'
                            : isOverdue
                            ? 'border border-red-500/30 bg-red-500/5'
                            : 'border border-accent/30 bg-accent/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              isDone ? 'muted' : isOverdue ? 'muted' : 'accent'
                            }
                          >
                            {task.type}
                          </Badge>
                          <Badge variant="muted">{task.status}</Badge>
                          {task.dueAt && (
                            <span
                              className={`text-sm ${
                                isOverdue && !isDone
                                  ? 'text-red-500'
                                  : 'text-text-muted'
                              }`}
                            >
                              {new Date(task.dueAt).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                        {task.notes && <div className="text-sm">{task.notes}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
