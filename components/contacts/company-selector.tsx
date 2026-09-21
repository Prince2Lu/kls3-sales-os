'use client'

// Company selector with search for Contact form
// Client-side search for 50-100 companies (current: 54)

import { useState, useMemo, useRef, useEffect } from 'react'
import type { Company } from '@/types/domain'
import { normalizeSearchValue, combineSearchValues } from '@/lib/utils/search'
import { Search, X, Building2, MapPin } from 'lucide-react'
import Link from 'next/link'

interface CompanySelectorProps {
  companies: Company[]
  value: string | null
  onChange: (companyId: string | null) => void
  required?: boolean
}

export function CompanySelector({
  companies,
  value,
  onChange,
  required = false,
}: CompanySelectorProps) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Get selected company
  const selectedCompany = companies.find((c) => c.id === value)

  // Filter companies based on search
  const filteredCompanies = useMemo(() => {
    if (!search.trim()) return companies

    const normalizedSearch = normalizeSearchValue(search)

    return companies.filter((company) => {
      // Search in: name, city, postalCode, website
      const searchableText = combineSearchValues([
        company.name,
        company.city,
        company.postalCode,
        company.website,
      ])

      return searchableText.includes(normalizedSearch)
    })
  }, [companies, search])

  // Reset focused index when filtered list changes
  useEffect(() => {
    setFocusedIndex(0)
  }, [filteredCompanies])

  // Handle company selection
  const handleSelect = (companyId: string) => {
    onChange(companyId)
    setSearch('')
    setIsOpen(false)
    inputRef.current?.blur()
  }

  // Handle clear selection
  const handleClear = () => {
    onChange(null)
    setSearch('')
    setIsOpen(false)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setSearch('')
        inputRef.current?.blur()
        break

      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((prev) =>
          prev < filteredCompanies.length - 1 ? prev + 1 : prev
        )
        break

      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break

      case 'Enter':
        e.preventDefault()
        if (filteredCompanies[focusedIndex]) {
          handleSelect(filteredCompanies[focusedIndex].id)
        }
        break

      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  // Scroll focused item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [focusedIndex, isOpen])

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-2">
        Entreprise{required && ' *'}
      </label>

      {/* Selected company display */}
      {selectedCompany && !isOpen && (
        <div className="flex items-center gap-2 w-full px-3 py-2 bg-card border border-border rounded-md mb-2">
          <Building2 className="w-4 h-4 text-text-muted flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{selectedCompany.name}</div>
            {(selectedCompany.city || selectedCompany.postalCode) && (
              <div className="flex items-center gap-1 text-xs text-text-muted">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  {[selectedCompany.city, selectedCompany.postalCode]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 hover:bg-card-bg rounded-md text-text-muted hover:text-text-primary"
            aria-label="Supprimer la sélection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search input */}
      {(!selectedCompany || isOpen) && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher une entreprise..."
            className="w-full pl-10 pr-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Rechercher une entreprise"
            aria-expanded={isOpen}
            aria-controls="company-results"
            autoComplete="off"
          />
        </div>
      )}

      {/* Results dropdown */}
      {isOpen && (
        <div
          id="company-results"
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-80 overflow-y-auto"
          role="listbox"
        >
          {filteredCompanies.length === 0 ? (
            <div className="p-4 text-center space-y-3">
              <div className="text-sm text-text-muted">
                Aucune entreprise trouvée.
              </div>
              <Link
                href="/companies/new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
                onClick={() => setIsOpen(false)}
              >
                <Building2 className="w-4 h-4" />
                Créer d'abord une entreprise
              </Link>
            </div>
          ) : (
            filteredCompanies.map((company, index) => (
              <button
                key={company.id}
                type="button"
                onClick={() => handleSelect(company.id)}
                onMouseEnter={() => setFocusedIndex(index)}
                className={`w-full px-4 py-3 text-left hover:bg-card-bg transition-colors ${
                  index === focusedIndex ? 'bg-card-bg' : ''
                }`}
                role="option"
                aria-selected={company.id === value}
              >
                <div className="font-medium text-sm">{company.name}</div>
                {(company.city || company.postalCode || company.website) && (
                  <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                    {(company.city || company.postalCode) && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span>
                          {[company.city, company.postalCode]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </div>
                    )}
                    {company.website && (
                      <span className="text-text-muted/70 truncate max-w-xs">
                        {company.website.replace(/^https?:\/\//, '')}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* Hidden input for form submission */}
      <input type="hidden" name="companyId" value={value || ''} />
    </div>
  )
}
