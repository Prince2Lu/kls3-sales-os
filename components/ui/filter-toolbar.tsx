'use client'

// Extended filter toolbar with Business Line, filters, and sort
// Complements SearchViewToolbar

import { X } from 'lucide-react'

interface FilterOption {
  value: string
  label: string
}

interface FilterToolbarProps {
  // Business Line filter
  businessLines?: FilterOption[]
  selectedBusinessLine?: string
  onBusinessLineChange?: (value: string) => void

  // Additional filters (optional)
  filters?: {
    label: string
    value: string
    options: FilterOption[]
    onChange: (value: string) => void
  }[]

  // Sort
  sortOptions?: FilterOption[]
  selectedSort?: string
  onSortChange?: (value: string) => void

  // Reset
  showReset?: boolean
  onReset?: () => void
}

export function FilterToolbar({
  businessLines,
  selectedBusinessLine,
  onBusinessLineChange,
  filters = [],
  sortOptions,
  selectedSort,
  onSortChange,
  showReset,
  onReset,
}: FilterToolbarProps) {
  if (!businessLines && filters.length === 0 && !sortOptions) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Business Line Filter */}
      {businessLines && onBusinessLineChange && (
        <select
          value={selectedBusinessLine || ''}
          onChange={(e) => onBusinessLineChange(e.target.value)}
          className="bg-card-bg border border-border rounded-full px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer"
        >
          {businessLines.map((bl) => (
            <option key={bl.value} value={bl.value}>
              {bl.label}
            </option>
          ))}
        </select>
      )}

      {/* Additional Filters */}
      {filters.map((filter, index) => (
        <select
          key={index}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          className="bg-card-bg border border-border rounded-full px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer"
        >
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ))}

      {/* Sort */}
      {sortOptions && onSortChange && (
        <select
          value={selectedSort || ''}
          onChange={(e) => onSortChange(e.target.value)}
          className="bg-card-bg border border-border rounded-full px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {/* Reset */}
      {showReset && onReset && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 px-3 py-2 text-xs text-text-muted hover:text-accent transition-colors"
          title="Réinitialiser les filtres"
        >
          <X className="w-3 h-3" />
          Réinitialiser
        </button>
      )}
    </div>
  )
}
