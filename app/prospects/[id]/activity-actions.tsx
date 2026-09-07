'use client'

// Activity action buttons (workflow enhancement)

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Activity } from '@/types/domain'

interface ActivityActionsProps {
  opportunityId: string
  activity: Activity
}

export function ActivityActions({
  opportunityId,
  activity,
}: ActivityActionsProps) {
  return (
    <div className="flex gap-2 mt-2">
      <Link
        href={`/prospects/${opportunityId}/activity/${activity.id}`}
        className="inline-block"
      >
        <Button size="sm" variant="ghost" className="text-xs h-7 px-2">
          Modifier
        </Button>
      </Link>
      <Link
        href={`/prospects/${opportunityId}/task?from=activity&activityId=${activity.id}&contactId=${activity.contactId || ''}`}
        className="inline-block"
      >
        <Button size="sm" variant="ghost" className="text-xs h-7 px-2">
          + Tâche
        </Button>
      </Link>
    </div>
  )
}
