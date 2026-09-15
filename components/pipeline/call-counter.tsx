'use client'

// Shared component for displaying call count

import type { Activity } from '@/types/domain'

interface CallCounterProps {
  activities: Activity[]
  compact?: boolean
}

export function CallCounter({ activities, compact = false }: CallCounterProps) {
  // Count only CALL type activities
  const callCount = activities.filter((a) => a.type === 'CALL').length

  if (callCount === 0) return null

  if (compact) {
    return (
      <span className="text-xs text-text-muted">
        📞 {callCount}
      </span>
    )
  }

  return (
    <div className="text-xs text-text-muted inline-flex items-center gap-1">
      <span>📞</span>
      <span>
        {callCount} appel{callCount > 1 ? 's' : ''}
      </span>
    </div>
  )
}
