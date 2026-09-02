'use client'

// Analytics filters with URL sync (Phase 7A)

import { useRouter, useSearchParams } from 'next/navigation'
import type { BusinessLine } from '@/types/domain'
import type { PeriodType } from '@/lib/utils/period'

interface AnalyticsFiltersProps {
  businessLines: BusinessLine[]
  selectedBusinessLineCode: string | null
  selectedPeriod: PeriodType
}

const PERIOD_LABELS: Record<string, string> = {
  week: 'Cette semaine',
  month: 'Ce mois',
  last30days: '30 derniers jours',
  last90days: '90 derniers jours',
}

export function AnalyticsFilters({
  businessLines,
  selectedBusinessLineCode,
  selectedPeriod,
}: AnalyticsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleBusinessLineChange = (code: string | null) => {
    const params = new URLSearchParams(searchParams.toString())

    if (code) {
      params.set('businessLine', code)
    } else {
      params.delete('businessLine')
    }

    router.push(`/analytics?${params.toString()}`)
  }

  const handlePeriodChange = (period: PeriodType) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', period)
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

      {/* Period Filter */}
      <div className="flex-1">
        <label className="block text-xs uppercase tracking-wider text-text-muted mb-2">
          Période
        </label>
        <select
          value={selectedPeriod}
          onChange={(e) => handlePeriodChange(e.target.value as PeriodType)}
          className="w-full px-4 py-3 bg-background-card border border-white/[0.07] rounded-2xl text-text-primary focus:outline-none focus:border-accent transition-colors"
        >
          <option value="week">{PERIOD_LABELS.week}</option>
          <option value="month">{PERIOD_LABELS.month}</option>
          <option value="last30days">{PERIOD_LABELS.last30days}</option>
          <option value="last90days">{PERIOD_LABELS.last90days}</option>
        </select>
      </div>
    </div>
  )
}
