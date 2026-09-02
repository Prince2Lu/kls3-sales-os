'use client'

// Period selector for Dashboard
// Allows filtering metrics by time period

import type { PeriodType } from '@/lib/utils/period'

interface PeriodSelectorProps {
  selectedPeriod: PeriodType
  onSelect: (period: PeriodType) => void
}

export function PeriodSelector({
  selectedPeriod,
  onSelect,
}: PeriodSelectorProps) {
  const periods: Array<{ value: PeriodType; label: string }> = [
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {periods.map((period) => {
        const isSelected = selectedPeriod === period.value

        return (
          <button
            key={period.value}
            onClick={() => onSelect(period.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-accent text-white'
                : 'bg-card-bg border border-border text-text-primary hover:border-accent/50'
            }`}
          >
            {period.label}
          </button>
        )
      })}
    </div>
  )
}
