// Velocity filters component (Phase 7C)
// Period and Business Line filtering for sales velocity view

'use client'

import Link from 'next/link'
import type { BusinessLine } from '@/types/domain'
import type { BusinessLineCode } from '@/lib/utils/business-line-filter'
import type { PeriodType } from '@/lib/utils/period'

interface VelocityFiltersProps {
  businessLines: BusinessLine[]
  selectedBusinessLineCode: BusinessLineCode | null
  selectedPeriod: PeriodType
}

const VELOCITY_PERIODS: { value: PeriodType; label: string }[] = [
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: 'last30days', label: '30 derniers jours' },
  { value: 'last90days', label: '90 derniers jours' },
]

export function VelocityFilters({
  businessLines,
  selectedBusinessLineCode,
  selectedPeriod,
}: VelocityFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Business Line Filter */}
      <div className="flex-1">
        <label className="block text-xs uppercase tracking-wider text-text-muted mb-2">
          Business Line
        </label>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/analytics?view=velocity"
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              !selectedBusinessLineCode
                ? 'bg-accent text-white'
                : 'bg-background-card border border-border-light text-text-primary hover:border-accent/50'
            }`}
          >
            Toutes
          </Link>
          {businessLines.map((bl) => (
            <Link
              key={bl.id}
              href={`/analytics?view=velocity&businessLine=${bl.code}&period=${selectedPeriod}`}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                selectedBusinessLineCode === bl.code
                  ? 'bg-accent text-white'
                  : 'bg-background-card border border-border-light text-text-primary hover:border-accent/50'
              }`}
            >
              {bl.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Period Filter */}
      <div className="flex-1">
        <label className="block text-xs uppercase tracking-wider text-text-muted mb-2">
          Période
        </label>
        <div className="flex flex-wrap gap-2">
          {VELOCITY_PERIODS.map((period) => {
            const href = selectedBusinessLineCode
              ? `/analytics?view=velocity&businessLine=${selectedBusinessLineCode}&period=${period.value}`
              : `/analytics?view=velocity&period=${period.value}`

            return (
              <Link
                key={period.value}
                href={href}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  selectedPeriod === period.value
                    ? 'bg-accent text-white'
                    : 'bg-background-card border border-border-light text-text-primary hover:border-accent/50'
                }`}
              >
                {period.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
