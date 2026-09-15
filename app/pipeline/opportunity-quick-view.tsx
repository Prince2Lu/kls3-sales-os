'use client'

// Quick View drawer for Opportunity cards (Pipeline ergonomics improvement)

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
import { EntityQuickView } from '@/components/pipeline/entity-quick-view'

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
  // Subtitle: contact name and job title
  const subtitle = contact ? (
    <p className="text-sm text-text-muted">
      {contact.firstName} {contact.lastName}
      {contact.jobTitle && ` · ${contact.jobTitle}`}
    </p>
  ) : null

  // Badges: Business Line + Priority + Stage
  const badges = (
    <>
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
    </>
  )

  // Actions: Create Activity / Task + Open full page
  const actions = (
    <>
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
    </>
  )

  return (
    <EntityQuickView
      open={open}
      onClose={onClose}
      title={company?.name || opportunity.name}
      subtitle={subtitle}
      badges={badges}
      company={company}
      contact={contact}
      lastActivity={lastActivity}
      nextTask={nextTask}
      showWebsite={false}
      actions={actions}
    />
  )
}
