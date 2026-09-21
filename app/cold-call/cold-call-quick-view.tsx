'use client'

// Quick View drawer for Cold Call Target cards

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type {
  ColdCallTarget,
  Company,
  Contact,
  BusinessLine,
  Activity,
  Task,
} from '@/types/domain'
import { EntityQuickView } from '@/components/pipeline/entity-quick-view'

interface ColdCallQuickViewProps {
  target: ColdCallTarget
  company: Company | null
  contact: Contact | null
  businessLine: BusinessLine | null
  lastActivity: Activity | null
  nextTask: Task | null
  activities: Activity[]
  open: boolean
  onClose: () => void
}

export function ColdCallQuickView({
  target,
  company,
  contact,
  businessLine,
  lastActivity,
  nextTask,
  activities,
  open,
  onClose,
}: ColdCallQuickViewProps) {
  // Subtitle: contact name and job title
  const subtitle = contact ? (
    <p className="text-sm text-text-muted">
      {contact.firstName} {contact.lastName}
      {contact.jobTitle && ` · ${contact.jobTitle}`}
    </p>
  ) : null

  // Badges: Business Line + Call Status
  const badges = (
    <>
      {businessLine && (
        <Badge variant="accent">
          {businessLine.code === 'SACHA' ? 'Leverio' : businessLine.name}
        </Badge>
      )}
      <Badge variant="muted">{target.callStatus}</Badge>
    </>
  )

  // Actions: Open full page (opportunity if exists, otherwise company)
  const detailPageUrl = target.opportunityId
    ? `/prospects/${target.opportunityId}`
    : target.companyId
      ? `/companies/${target.companyId}`
      : null

  const actions = detailPageUrl ? (
    <Link href={detailPageUrl} className="block">
      <Button variant="primary" className="w-full" size="sm">
        Ouvrir la fiche complète
      </Button>
    </Link>
  ) : null

  return (
    <EntityQuickView
      open={open}
      onClose={onClose}
      title={company?.name || 'Entreprise inconnue'}
      subtitle={subtitle}
      badges={badges}
      company={company}
      contact={contact}
      lastActivity={lastActivity}
      nextTask={nextTask}
      activities={activities}
      showWebsite={true}
      actions={actions}
    />
  )
}
