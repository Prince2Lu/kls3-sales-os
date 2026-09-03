// Efficiency view filters component
// Business Line and Period selection

import type { BusinessLine } from '@/types/domain'
import type { BusinessLineCode } from '@/lib/utils/business-line-filter'
import type { PeriodType } from '@/lib/utils/period'
import Link from 'next/link'

interface EfficiencyFiltersProps {
  businessLines: BusinessLine[]
  selectedBusinessLineCode: BusinessLineCode | null
  selectedPeriod: PeriodType
}

export function EfficiencyFilters({
  businessLines,
  selectedBusinessLineCode,
  selectedPeriod,
}: EfficiencyFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Business Line Filter */}
      <div className="flex-1">
        <label className="block text-xs uppercase tracking-wider text-text-muted mb-2">
          Business Line
        </label>
        <div className="flex flex-wrap gap-2">
          {/* "Toutes" option */}
          <Link
            href="/analytics?view=efficiency"
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              !selectedBusinessLineCode
                ? 'bg-accent text-white'
                : 'bg-background-card border border-border-light text-text-primary hover:border-accent/50'
            }`}
          >
            Toutes
          </Link>

          {/* Individual Business Lines */}
          {businessLines.map((bl) => (
            <Link
              key={bl.id}
              href={`/analytics?view=efficiency&businessLine=${bl.code}&period=${selectedPeriod}`}
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
          <Link
            href={`/analytics?view=efficiency${selectedBusinessLineCode ? `&businessLine=${selectedBusinessLineCode}` : ''}&period=week`}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              selectedPeriod === 'week'
                ? 'bg-accent text-white'
                : 'bg-background-card border border-border-light text-text-primary hover:border-accent/50'
            }`}
          >
            Cette semaine
          </Link>

          <Link
            href={`/analytics?view=efficiency${selectedBusinessLineCode ? `&businessLine=${selectedBusinessLineCode}` : ''}&period=month`}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              selectedPeriod === 'month'
                ? 'bg-accent text-white'
                : 'bg-background-card border border-border-light text-text-primary hover:border-accent/50'
            }`}
          >
            Ce mois
          </Link>

          <Link
            href={`/analytics?view=efficiency${selectedBusinessLineCode ? `&businessLine=${selectedBusinessLineCode}` : ''}&period=last30days`}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              selectedPeriod === 'last30days'
                ? 'bg-accent text-white'
                : 'bg-background-card border border-border-light text-text-primary hover:border-accent/50'
            }`}
          >
            30 derniers jours
          </Link>

          <Link
            href={`/analytics?view=efficiency${selectedBusinessLineCode ? `&businessLine=${selectedBusinessLineCode}` : ''}&period=last90days`}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              selectedPeriod === 'last90days'
                ? 'bg-accent text-white'
                : 'bg-background-card border border-border-light text-text-primary hover:border-accent/50'
            }`}
          >
            90 derniers jours
          </Link>
        </div>
      </div>
    </div>
  )
}
