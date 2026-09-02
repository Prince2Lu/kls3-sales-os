'use client'

// Business Line selector for Dashboard
// Compact tab-based selector for filtering by Business Line

import type { BusinessLine } from '@/types/domain'

interface BusinessLineSelectorProps {
  businessLines: BusinessLine[]
  selectedBusinessLineId: string | null
  onSelect: (businessLineId: string | null) => void
}

export function BusinessLineSelector({
  businessLines,
  selectedBusinessLineId,
  onSelect,
}: BusinessLineSelectorProps) {
  const isAllSelected = selectedBusinessLineId === null

  return (
    <div className="flex flex-wrap gap-2">
      {/* Toutes option */}
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          isAllSelected
            ? 'bg-accent text-white'
            : 'bg-card-bg border border-border text-text-primary hover:border-accent/50'
        }`}
      >
        Toutes
      </button>

      {/* Individual Business Lines */}
      {businessLines.map((bl) => {
        const isSelected = selectedBusinessLineId === bl.id

        return (
          <button
            key={bl.id}
            onClick={() => onSelect(bl.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-accent text-white'
                : 'bg-card-bg border border-border text-text-primary hover:border-accent/50'
            }`}
          >
            {bl.name}
          </button>
        )
      })}
    </div>
  )
}
