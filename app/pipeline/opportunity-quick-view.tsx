'use client'

// Quick View drawer for Opportunity cards (Pipeline ergonomics improvement)

import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetContent,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type {
  Opportunity,
  Company,
  Contact,
  BusinessLine,
  Activity,
  Task,
} from '@/types/domain'
import {
  getFrenchActivityType,
  getFrenchTaskType,
  getFrenchPriority,
} from '@/lib/utils/french-labels'

interface OpportunityQuickViewProps {
  opportunity: Opportunity
  company: Company | null
  contact: Contact | null
  businessLine: BusinessLine | null
  lastActivity: Activity | null
  nextTask: Task | null
  open: boolean
  onClose: () => void
}

export function OpportunityQuickView({
  opportunity,
  company,
  contact,
  businessLine,
  lastActivity,
  nextTask,
  open,
  onClose,
}: OpportunityQuickViewProps) {
  // Determine phone to use: contact phone > company phone
  const phoneNumber = contact?.phone || company?.phone
  const phoneType = contact?.phone ? 'Direct' : 'Standard'

  return (
    <Sheet open={open} onClose={onClose} side="right">
      <SheetHeader>
        <div className="space-y-2">
          <SheetTitle>{company?.name || opportunity.name}</SheetTitle>
          {contact && (
            <p className="text-sm text-text-muted">
              {contact.firstName} {contact.lastName}
              {contact.jobTitle && ` · ${contact.jobTitle}`}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {businessLine && (
              <Badge variant="accent">{businessLine.name}</Badge>
            )}
            {opportunity.priority && (
              <Badge
                variant={
                  opportunity.priority === 'HIGH' || opportunity.priority === 'URGENT'
                    ? 'accent'
                    : 'default'
                }
              >
                {opportunity.priority === 'HIGH'
                  ? 'A · HIGH'
                  : opportunity.priority === 'MEDIUM'
                    ? 'B · MEDIUM'
                    : opportunity.priority === 'URGENT'
                      ? 'URGENT'
                      : 'C · LOW'}
              </Badge>
            )}
            <Badge variant="muted">{opportunity.stage}</Badge>
          </div>
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

            {contact?.email && (
              <div className="text-sm">
                <span className="text-text-muted">Email : </span>
                <a
                  href={`mailto:${contact.email}`}
                  className="text-accent hover:underline"
                >
                  {contact.email}
                </a>
              </div>
            )}
          </div>
        </section>

        {/* DERNIÈRE ACTIVITÉ */}
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

        {/* ACTIONS SECONDAIRES */}
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Link href={`/prospects/${opportunity.id}/activity`}>
              <Button variant="ghost" className="w-full" size="sm">
                + Activité
              </Button>
            </Link>
            <Link href={`/prospects/${opportunity.id}/task`}>
              <Button variant="ghost" className="w-full" size="sm">
                + Tâche
              </Button>
            </Link>
          </div>

          <Link href={`/prospects/${opportunity.id}`} className="block">
            <Button variant="primary" className="w-full" size="sm">
              Ouvrir la fiche complète
            </Button>
          </Link>
        </section>
      </SheetContent>
    </Sheet>
  )
}
