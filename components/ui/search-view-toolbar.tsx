'use client'

// Shared search and view toggle toolbar
// Used consistently across Prospects, Companies, and Contacts

import { Search, Grid3x3, List } from 'lucide-react'

export type ViewMode = 'grid' | 'list'

interface SearchViewToolbarProps {
  searchPlaceholder: string
  searchValue: string
  onSearchChange: (value: string) => void
  view: ViewMode
  onViewChange: (view: ViewMode) => void
}

export function SearchViewToolbar({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  view,
  onViewChange,
}: SearchViewToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      {/* Search Input */}
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-card-bg border border-border rounded-full pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 bg-card-bg border border-border rounded-full p-1">
        <button
          onClick={() => onViewChange('grid')}
          className={`p-2 rounded-full transition-colors ${
            view === 'grid'
              ? 'bg-accent text-white'
              : 'text-text-muted hover:text-text-primary'
          }`}
          aria-label="Vue grille"
          title="Vue grille"
        >
          <Grid3x3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewChange('list')}
          className={`p-2 rounded-full transition-colors ${
            view === 'list'
              ? 'bg-accent text-white'
              : 'text-text-muted hover:text-text-primary'
          }`}
          aria-label="Vue liste"
          title="Vue liste"
        >
          <List className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
