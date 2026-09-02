// View toggle component (Phase 7B)
// Switches between Activity (Phase 7A) and Cohort (Phase 7B) views

'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface ViewToggleProps {
  currentView: 'activity' | 'cohort'
}

export function ViewToggle({ currentView }: ViewToggleProps) {
  const searchParams = useSearchParams()

  // Build URL with view param, preserve other params
  const buildUrl = (view: 'activity' | 'cohort') => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    return `/analytics?${params.toString()}`
  }

  return (
    <div className="flex items-center gap-2 bg-background-card border border-white/[0.07] rounded-full p-1">
      <Link
        href={buildUrl('activity')}
        className={`
          px-6 py-2 rounded-full text-sm font-medium transition-all
          ${
            currentView === 'activity'
              ? 'bg-accent text-white'
              : 'text-text-muted hover:text-text-primary'
          }
        `}
      >
        Activité
      </Link>
      <Link
        href={buildUrl('cohort')}
        className={`
          px-6 py-2 rounded-full text-sm font-medium transition-all
          ${
            currentView === 'cohort'
              ? 'bg-accent text-white'
              : 'text-text-muted hover:text-text-primary'
          }
        `}
      >
        Conversion 30j
      </Link>
    </div>
  )
}
