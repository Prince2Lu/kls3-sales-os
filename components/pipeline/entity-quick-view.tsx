'use client'

// Shared Quick View drawer for Opportunity and Cold Call Target cards
// Contains all common sections: contact, phone, email, last activity, next task

import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetContent,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import type {
  Company,
  Contact,
  Activity,
  Task,
} from '@/types/domain'
import {
  getFrenchActivityType,
  getFrenchTaskType,
  getFrenchPriority,
} from '@/lib/utils/french-labels'

interface EntityQuickViewProps {
  // Sheet control
  open: boolean
  onClose: () => void

  // Title and subtitle
  title: string
  subtitle?: React.ReactNode

  // Badges slot (specific to each entity type)
  badges?: React.ReactNode

  // Core data
  company: Company | null
  contact: Contact | null
  lastActivity: Activity | null
  nextTask: Task | null
  activities?: Activity[] // Optional: full activity history (if provided, shows timeline instead of just lastActivity)

  // Optional sections
  showWebsite?: boolean

  // Actions slot (specific to each entity type)
  actions?: React.ReactNode
}

export function EntityQuickView({
  open,
  onClose,
  title,
  subtitle,
  badges,
  company,
  contact,
  lastActivity,
  nextTask,
  activities,
  showWebsite = false,
  actions,
}: EntityQuickViewProps) {
  // Determine phone to use: contact phone > company phone
  const phoneNumber = contact?.phone || company?.phone
  const phoneType = contact?.phone ? 'Direct' : 'Standard'
  const email = contact?.email || company?.email

  // Sort activities by date (most recent first) if provided
  const sortedActivities = activities
    ? [...activities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : []

  return (
    <Sheet open={open} onClose={onClose} side="right">
      <SheetHeader>
        <div className="space-y-2">
          <SheetTitle>{title}</SheetTitle>
          {subtitle}
          {badges && <div className="flex flex-wrap gap-2 mt-3">{badges}</div>}
        </div>
      </SheetHeader>

      <SheetContent>
        {/* CONTACT RAPIDE */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-accent">
            Contact rapide
          </h3>

          <div className="space-y-2">
            {contact && (
              <div className="text-sm">
                <span className="text-text-muted">Fonction : </span>
                <span className="text-text-primary">
                  {contact.jobTitle || 'Non renseignée'}
                </span>
              </div>
            )}

            {phoneNumber ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-text-muted">Téléphone : </span>
                  <span className="text-text-primary">{phoneNumber}</span>
                  <Badge variant="muted" className="text-xs">
                    {phoneType}
                  </Badge>
                </div>

                {/* ACTION PRINCIPALE */}
                <a
                  href={`tel:${phoneNumber}`}
                  className="block w-full px-6 py-3 bg-accent text-white font-medium rounded-full text-center hover:opacity-90 transition-opacity"
                >
                  Appeler {phoneType === 'Direct' ? 'le contact' : 'le standard'}
                </a>
              </div>
            ) : (
              <div className="px-4 py-3 bg-card border border-border rounded-lg text-sm text-text-muted text-center">
                Téléphone non renseigné
              </div>
            )}

            {email && (
              <div className="text-sm">
                <span className="text-text-muted">{contact?.email ? 'Email direct' : 'Email de l’étude'} : </span>
                <a
                  href={`mailto:${email}`}
                  className="text-accent hover:underline"
                >
                  {email}
                </a>
              </div>
            )}

            {showWebsite && company?.website && (
              <div className="text-sm">
                <span className="text-text-muted">Site web : </span>
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  {company.website}
                </a>
              </div>
            )}
          </div>
        </section>

        {/* HISTORIQUE MULTICANAL (if activities provided) or DERNIÈRE ACTIVITÉ (fallback) */}
        {activities && activities.length > 0 ? (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-accent">
              Historique multicanal
            </h3>

            <div className="space-y-3">
              {sortedActivities.map((activity) => (
                <div key={activity.id} className="space-y-2 text-sm pb-3 border-b border-border last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="muted">
                      {getFrenchActivityType(activity.type)}
                    </Badge>
                    {activity.result && (
                      <Badge variant="default">{activity.result}</Badge>
                    )}
                  </div>
                  <div className="text-text-muted text-xs">
                    {new Date(activity.date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                  {activity.notes && (
                    <p className="text-text-primary text-xs line-clamp-2">
                      {activity.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-accent">
              Dernière activité
            </h3>

            {lastActivity ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="muted">
                    {getFrenchActivityType(lastActivity.type)}
                  </Badge>
                  {lastActivity.result && (
                    <Badge variant="default">{lastActivity.result}</Badge>
                  )}
                </div>
                <div className="text-text-muted">
                  {new Date(lastActivity.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
                {lastActivity.notes && (
                  <p className="text-text-primary line-clamp-3">
                    {lastActivity.notes}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-muted">Aucune activité enregistrée</p>
            )}
          </section>
        )}

        {/* PROCHAINE TÂCHE */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-accent">
            Prochaine tâche
          </h3>

          {nextTask ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="accent">
                  {getFrenchTaskType(nextTask.type)}
                </Badge>
                {nextTask.priority && (
                  <Badge variant="default">
                    {getFrenchPriority(nextTask.priority)}
                  </Badge>
                )}
              </div>
              {nextTask.dueAt && (
                <div className="text-text-primary font-medium">
                  {new Date(nextTask.dueAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              )}
              {nextTask.notes && (
                <p className="text-text-muted line-clamp-3">{nextTask.notes}</p>
              )}
              <div className="text-text-muted text-xs">
                Assigné à {nextTask.owner}
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-muted">Aucune tâche planifiée</p>
          )}
        </section>

        {/* ACTIONS (slot for entity-specific actions) */}
        {actions && <section className="space-y-3">{actions}</section>}
      </SheetContent>
    </Sheet>
  )
}
