'use client'

// Cohort filters with URL sync (Phase 7B)

import { useRouter, useSearchParams } from 'next/navigation'
import type { BusinessLine } from '@/types/domain'
import type { CohortPeriodType } from '@/lib/utils/cohort-analytics'

interface CohortFiltersProps {
  businessLines: BusinessLine[]
  selectedBusinessLineCode: string | null
  selectedCohortPeriod: CohortPeriodType
}

const COHORT_PERIOD_LABELS: Record<CohortPeriodType, string> = {
  thisMonth: 'Ce mois',
  lastMonth: 'Mois dernier',
  last90days: '90 derniers jours',
}

export function CohortFilters({
  businessLines,
  selectedBusinessLineCode,
  selectedCohortPeriod,
}: CohortFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleBusinessLineChange = (code: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', 'cohort') // Ensure view stays cohort

    if (code) {
      params.set('businessLine', code)
    } else {
      params.delete('businessLine')
    }

    router.push(`/analytics?${params.toString()}`)
  }

  const handleCohortPeriodChange = (period: CohortPeriodType) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', 'cohort') // Ensure view stays cohort
    params.set('cohortPeriod', period)
    router.push(`/analytics?${params.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Business Line Filter */}
      <div className="flex-1">
        <label className="block text-xs uppercase tracking-wider text-text-muted mb-2">
          Business Line
        </label>
        <select
          value={selectedBusinessLineCode || ''}
          onChange={(e) =>
            handleBusinessLineChange(e.target.value || null)
          }
          className="w-full px-4 py-3 bg-background-card border border-white/[0.07] rounded-2xl text-text-primary focus:outline-none focus:border-accent transition-colors"
        >
          <option value="">Toutes</option>
          {businessLines.map((bl) => (
            <option key={bl.id} value={bl.code}>
              {bl.name}
            </option>
          ))}
        </select>
      </div>

      {/* Cohort Period Filter */}
      <div className="flex-1">
        <label className="block text-xs uppercase tracking-wider text-text-muted mb-2">
          Période de cohorte
        </label>
        <select
          value={selectedCohortPeriod}
          onChange={(e) =>
            handleCohortPeriodChange(e.target.value as CohortPeriodType)
          }
          className="w-full px-4 py-3 bg-background-card border border-white/[0.07] rounded-2xl text-text-primary focus:outline-none focus:border-accent transition-colors"
        >
          <option value="lastMonth">{COHORT_PERIOD_LABELS.lastMonth}</option>
          <option value="thisMonth">{COHORT_PERIOD_LABELS.thisMonth}</option>
          <option value="last90days">{COHORT_PERIOD_LABELS.last90days}</option>
        </select>
      </div>
    </div>
  )
}
