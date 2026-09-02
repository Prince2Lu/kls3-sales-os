'use client'

// Client-side companies list with search, faceted filters, sorts, and view toggle

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SearchViewToolbar } from '@/components/ui/search-view-toolbar'
import { FilterToolbar } from '@/components/ui/filter-toolbar'
import { useViewPersistence } from '@/lib/hooks/use-view-persistence'
import { normalizeSearchValue } from '@/lib/utils/search'
import { compareStringsAsc, compareStringsDesc, compareNumbersAsc, compareNumbersDesc } from '@/lib/utils/sorting'
import { deriveCompanyBusinessLines, getBusinessLineNames } from '@/lib/utils/business-lines'
import { extractUniqueValues, extractUniqueArrayValues, isValueStillValid } from '@/lib/utils/faceted-filters'
import type { Company, Contact, Opportunity, BusinessLine } from '@/types/domain'

interface CompaniesClientProps {
  companies: Company[]
  contacts: Contact[]
  opportunities: Opportunity[]
  businessLines: BusinessLine[]
}

// Extended company with derived data
interface CompanyData extends Company {
  businessLineIds: string[]
  businessLineNames: string[]
  opportunityCount: number
}

export function CompaniesClient({
  companies,
  contacts,
  opportunities,
  businessLines,
}: CompaniesClientProps) {
  const [search, setSearch] = useState('')
  const [view, setView, isClient] = useViewPersistence('kls3-companies-view', 'grid')

  // Filters
  const [selectedBusinessLine, setSelectedBusinessLine] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('')

  // Sort
  const [selectedSort, setSelectedSort] = useState('')

  // Count contacts per company
  const contactCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    contacts.forEach((contact) => {
      if (contact.companyId) {
        counts[contact.companyId] = (counts[contact.companyId] || 0) + 1
      }
    })
    return counts
  }, [contacts])

  // Derive Business Lines and opportunity counts for each company
  const companyData = useMemo(() => {
    return companies.map((company) => {
      const businessLineIds = deriveCompanyBusinessLines(company.id, opportunities)
      const businessLineNames = getBusinessLineNames(businessLineIds, businessLines)
      const opportunityCount = opportunities.filter((opp) => opp.companyId === company.id).length

      return {
        ...company,
        businessLineIds,
        businessLineNames,
        opportunityCount,
      }
    })
  }, [companies, opportunities, businessLines])

  // Helper: Apply a single filter to company data
  const applySingleFilter = (records: CompanyData[], key: string, value: string): CompanyData[] => {
    if (!value) return records

    switch (key) {
      case 'businessLine':
        return records.filter((c) => c.businessLineIds.includes(value))
      case 'city':
        return records.filter((c) => c.city === value)
      case 'industry':
        return records.filter((c) => c.industry === value)
      default:
        return records
    }
  }

  // Helper: Apply filters except one (for faceted filtering)
  const applyFiltersExcept = (excludeKey: string): CompanyData[] => {
    let result = [...companyData]

    const filters = {
      businessLine: selectedBusinessLine,
      city: selectedCity,
      industry: selectedIndustry,
    }

    for (const [key, value] of Object.entries(filters)) {
      if (key !== excludeKey && value) {
        result = applySingleFilter(result, key, value)
      }
    }

    return result
  }

  // FACETED FILTER OPTIONS

  // Business Line options (derived after applying City + Industry)
  const businessLineOptions = useMemo(() => {
    const filtered = applyFiltersExcept('businessLine')
    const availableIds = extractUniqueArrayValues(filtered, (c) => c.businessLineIds)

    return [
      { value: '', label: 'Toutes' },
      ...businessLines
        .filter((bl) => availableIds.includes(bl.id))
        .map((bl) => ({ value: bl.id, label: bl.name }))
    ]
  }, [companyData, selectedCity, selectedIndustry, businessLines])

  // City options (derived after applying Business Line + Industry)
  const cityOptions = useMemo(() => {
    const filtered = applyFiltersExcept('city')
    const availableCities = extractUniqueValues(filtered, (c) => c.city || '')

    return [
      { value: '', label: 'Toutes' },
      ...availableCities.map((city) => ({ value: city, label: city }))
    ]
  }, [companyData, selectedBusinessLine, selectedIndustry])

  // Industry options (derived after applying Business Line + City)
  const industryOptions = useMemo(() => {
    const filtered = applyFiltersExcept('industry')
    const availableIndustries = extractUniqueValues(filtered, (c) => c.industry || '')

    return [
      { value: '', label: 'Tous' },
      ...availableIndustries.map((industry) => ({ value: industry, label: industry }))
    ]
  }, [companyData, selectedBusinessLine, selectedCity])

  // Auto-reset invalid selections when filter options change
  useEffect(() => {
    const validBusinessLines = businessLineOptions.map((opt) => opt.value)
    if (!isValueStillValid(selectedBusinessLine, validBusinessLines)) {
      setSelectedBusinessLine('')
    }
  }, [businessLineOptions])

  useEffect(() => {
    const validCities = cityOptions.map((opt) => opt.value)
    if (!isValueStillValid(selectedCity, validCities)) {
      setSelectedCity('')
    }
  }, [cityOptions])

  useEffect(() => {
    const validIndustries = industryOptions.map((opt) => opt.value)
    if (!isValueStillValid(selectedIndustry, validIndustries)) {
      setSelectedIndustry('')
    }
  }, [industryOptions])

  // Combined search + filter + sort
  const filteredAndSortedCompanies = useMemo(() => {
    let result = [...companyData]

    // 1. SEARCH (including Business Line names)
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      result = result.filter((company) => {
        if (normalizeSearchValue(company.name).includes(searchLower)) return true
        if (normalizeSearchValue(company.city).includes(searchLower)) return true
        if (normalizeSearchValue(company.industry).includes(searchLower)) return true
        if (normalizeSearchValue(company.website).includes(searchLower)) return true

        // Search Business Line names
        if (company.businessLineNames.some((blName) => normalizeSearchValue(blName).includes(searchLower))) {
          return true
        }

        return false
      })
    }

    // 2. APPLY ALL FILTERS
    result = applySingleFilter(result, 'businessLine', selectedBusinessLine)
    result = applySingleFilter(result, 'city', selectedCity)
    result = applySingleFilter(result, 'industry', selectedIndustry)

    // 3. SORT
    if (selectedSort) {
      result.sort((a, b) => {
        switch (selectedSort) {
          case 'name-asc':
            return compareStringsAsc(a.name, b.name)
          case 'name-desc':
            return compareStringsDesc(a.name, b.name)
          case 'city-asc':
            return compareStringsAsc(a.city, b.city)
          case 'opp-count-asc':
            return compareNumbersAsc(a.opportunityCount, b.opportunityCount)
          case 'opp-count-desc':
            return compareNumbersDesc(a.opportunityCount, b.opportunityCount)
          default:
            return 0
        }
      })
    }

    return result
  }, [companyData, search, selectedBusinessLine, selectedCity, selectedIndustry, selectedSort])

  // Reset function
  const handleReset = () => {
    setSearch('')
    setSelectedBusinessLine('')
    setSelectedCity('')
    setSelectedIndustry('')
    setSelectedSort('')
  }

  // Check if any filters are active
  const hasActiveFilters = search || selectedBusinessLine || selectedCity || selectedIndustry || selectedSort

  // Sort options
  const sortOptions = [
    { value: '', label: 'Tri par défaut' },
    { value: 'name-asc', label: 'Nom A→Z' },
    { value: 'name-desc', label: 'Nom Z→A' },
    { value: 'city-asc', label: 'Ville A→Z' },
    { value: 'opp-count-asc', label: 'Opportunités croissant' },
    { value: 'opp-count-desc', label: 'Opportunités décroissant' },
  ]

  return (
    <div className="space-y-6">
      {/* Search and View Toggle */}
      <SearchViewToolbar
        searchPlaceholder="Rechercher une entreprise..."
        searchValue={search}
        onSearchChange={setSearch}
        view={view}
        onViewChange={setView}
      />

      {/* Filters and Sort */}
      <FilterToolbar
        businessLines={businessLineOptions}
        selectedBusinessLine={selectedBusinessLine}
        onBusinessLineChange={setSelectedBusinessLine}
        filters={[
          {
            label: 'Ville',
            value: selectedCity,
            options: cityOptions,
            onChange: setSelectedCity,
          },
          {
            label: 'Secteur',
            value: selectedIndustry,
            options: industryOptions,
            onChange: setSelectedIndustry,
          },
        ]}
        sortOptions={sortOptions}
        selectedSort={selectedSort}
        onSortChange={setSelectedSort}
        showReset={!!hasActiveFilters}
        onReset={handleReset}
      />

      {/* Result Count */}
      <div className="text-text-muted text-sm">
        {hasActiveFilters
          ? `${filteredAndSortedCompanies.length} / ${companies.length} entreprise${filteredAndSortedCompanies.length !== 1 ? 's' : ''}`
          : `${filteredAndSortedCompanies.length} entreprise${filteredAndSortedCompanies.length !== 1 ? 's' : ''}`}
      </div>

      {/* Empty State */}
      {filteredAndSortedCompanies.length === 0 && (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <p className="text-text-muted text-lg">
              {hasActiveFilters ? 'Aucune entreprise trouvée.' : 'Aucune entreprise pour le moment'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="text-accent hover:underline text-sm"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Grid View */}
      {view === 'grid' && filteredAndSortedCompanies.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedCompanies.map((company) => (
            <Link key={company.id} href={`/companies/${company.id}`}>
              <Card className="hover:border-accent/50 transition-all cursor-pointer h-full">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{company.name}</h3>

                    {/* Business Line Badges */}
                    {company.businessLineNames.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {company.businessLineNames.map((blName, index) => (
                          <Badge key={index} variant="accent" className="text-xs">
                            {blName}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-sm text-text-muted">
                    {company.industry && <div>{company.industry}</div>}
                    {company.city && <div>{company.city}</div>}
                    {company.website && (
                      <div className="text-xs truncate">{company.website}</div>
                    )}
                  </div>

                  {company.opportunityCount > 0 && (
                    <div className="text-xs text-text-muted">
                      {company.opportunityCount} opportunité{company.opportunityCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* List View */}
      {view === 'list' && filteredAndSortedCompanies.length > 0 && (
        <div className="bg-card-bg border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-xs text-text-muted uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Entreprise</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">
                  Business Lines
                </th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Secteur</th>
                <th className="px-4 py-3 font-medium hidden xl:table-cell">Ville</th>
                <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">
                  Opportunités
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedCompanies.map((company) => {
                const contactCount = contactCounts[company.id] || 0

                return (
                  <tr
                    key={company.id}
                    className="border-b border-border last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => (window.location.href = `/companies/${company.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{company.name}</div>
                      {company.website && (
                        <div className="text-xs text-text-muted truncate max-w-xs mt-0.5">
                          {company.website}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {company.businessLineNames.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {company.businessLineNames.map((blName, index) => (
                            <Badge key={index} variant="accent" className="text-xs">
                              {blName}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-text-muted/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="text-sm text-text-muted">
                        {company.industry || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <div className="text-sm text-text-muted">
                        {company.city || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <div className="text-sm text-text-muted">
                        {company.opportunityCount > 0 ? company.opportunityCount : '—'}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
