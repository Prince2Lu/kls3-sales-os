// View toggle component (Phase 7A/7B/7C/7D)
// Switches between Activity (7A), Cohort (7B), Velocity (7C), and Efficiency (7D) views

'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface ViewToggleProps {
  currentView: 'activity' | 'cohort' | 'velocity' | 'efficiency'
}

export function ViewToggle({ currentView }: ViewToggleProps) {
  const searchParams = useSearchParams()

  // Build URL with view param, preserve other params
  const buildUrl = (view: 'activity' | 'cohort' | 'velocity' | 'efficiency') => {
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
      <Link
        href={buildUrl('velocity')}
        className={`
          px-6 py-2 rounded-full text-sm font-medium transition-all
          ${
            currentView === 'velocity'
              ? 'bg-accent text-white'
              : 'text-text-muted hover:text-text-primary'
          }
        `}
      >
        Vélocité
      </Link>
      <Link
        href={buildUrl('efficiency')}
        className={`
          px-6 py-2 rounded-full text-sm font-medium transition-all
          ${
            currentView === 'efficiency'
              ? 'bg-accent text-white'
              : 'text-text-muted hover:text-text-primary'
          }
        `}
      >
        Efficacité
      </Link>
    </div>
  )
}
