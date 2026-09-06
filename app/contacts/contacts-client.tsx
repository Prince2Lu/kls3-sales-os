'use client'

// Client-side contacts list with search, faceted filters, sorts, and view toggle

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SearchViewToolbar } from '@/components/ui/search-view-toolbar'
import { FilterToolbar } from '@/components/ui/filter-toolbar'
import { useViewPersistence } from '@/lib/hooks/use-view-persistence'
import { normalizeSearchValue, combineSearchValues } from '@/lib/utils/search'
import { compareStringsAsc, compareStringsDesc } from '@/lib/utils/sorting'
import { deriveContactBusinessLines, getBusinessLineNames } from '@/lib/utils/business-lines'
import { extractUniqueValues, extractUniqueArrayValues, isValueStillValid } from '@/lib/utils/faceted-filters'
import type { Contact, Company, Opportunity, BusinessLine } from '@/types/domain'

interface ContactsClientProps {
  contacts: Contact[]
  companies: Company[]
  opportunities: Opportunity[]
  businessLines: BusinessLine[]
}

// Extended contact with derived data
interface ContactData extends Contact {
  businessLineIds: string[]
  businessLineNames: string[]
  opportunityCount: number
}

export function ContactsClient({
  contacts,
  companies,
  opportunities,
  businessLines,
}: ContactsClientProps) {
  const [search, setSearch] = useState('')
  const [view, setView, isClient] = useViewPersistence('kls3-contacts-view', 'grid')

  // Filters
  const [selectedBusinessLine, setSelectedBusinessLine] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedJobTitle, setSelectedJobTitle] = useState('')

  // Sort
  const [selectedSort, setSelectedSort] = useState('')

  // Create company map
  const companyMap = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies]
  )

  // Create Business Line map
  const blMap = useMemo(
    () => Object.fromEntries(businessLines.map((bl) => [bl.id, bl])),
    [businessLines]
  )

  // Derive Business Lines and opportunity counts for each contact
  const contactData = useMemo(() => {
    return contacts.map((contact) => {
      const businessLineIds = deriveContactBusinessLines(contact.id, opportunities)
      const businessLineNames = getBusinessLineNames(businessLineIds, businessLines)
      const opportunityCount = opportunities.filter((opp) => opp.primaryContactId === contact.id).length

      return {
        ...contact,
        businessLineIds,
        businessLineNames,
        opportunityCount,
      }
    })
  }, [contacts, opportunities, businessLines])

  // Helper: Apply a single filter to contact data
  const applySingleFilter = (records: ContactData[], key: string, value: string): ContactData[] => {
    if (!value) return records

    switch (key) {
      case 'businessLine':
        return records.filter((c) => c.businessLineIds.includes(value))
      case 'company':
        return records.filter((c) => c.companyId === value)
      case 'jobTitle':
        return records.filter((c) => c.jobTitle === value)
      default:
        return records
    }
  }

  // Helper: Apply filters except one (for faceted filtering)
  const applyFiltersExcept = (excludeKey: string): ContactData[] => {
    let result = [...contactData]

    const filters = {
      businessLine: selectedBusinessLine,
      company: selectedCompany,
      jobTitle: selectedJobTitle,
    }

    for (const [key, value] of Object.entries(filters)) {
      if (key !== excludeKey && value) {
        result = applySingleFilter(result, key, value)
      }
    }

    return result
  }

  // FACETED FILTER OPTIONS

  // Business Line options (derived after applying Company + Job Title)
  const businessLineOptions = useMemo(() => {
    const filtered = applyFiltersExcept('businessLine')
    const availableIds = extractUniqueArrayValues(filtered, (c) => c.businessLineIds)

    return [
      { value: '', label: 'Toutes' },
      ...businessLines
        .filter((bl) => availableIds.includes(bl.id))
        .map((bl) => ({ value: bl.id, label: bl.name }))
    ]
  }, [contactData, selectedCompany, selectedJobTitle, businessLines])

  // Company options (derived after applying Business Line + Job Title)
  const companyOptions = useMemo(() => {
    const filtered = applyFiltersExcept('company')
    const availableCompanyIds = extractUniqueValues(filtered, (c) => c.companyId || '')

    return [
      { value: '', label: 'Toutes' },
      ...companies
        .filter((company) => availableCompanyIds.includes(company.id))
        .slice()
        .sort((a, b) => compareStringsAsc(a.name, b.name))
        .map((company) => ({ value: company.id, label: company.name || 'Sans nom' }))
    ]
  }, [contactData, selectedBusinessLine, selectedJobTitle, companies])

  // Job Title options (derived after applying Business Line + Company)
  const jobTitleOptions = useMemo(() => {
    const filtered = applyFiltersExcept('jobTitle')
    const availableTitles = extractUniqueValues(filtered, (c) => c.jobTitle || '')

    return [
      { value: '', label: 'Toutes' },
      ...availableTitles.map((title) => ({ value: title, label: title }))
    ]
  }, [contactData, selectedBusinessLine, selectedCompany])

  // Auto-reset invalid selections when filter options change
  useEffect(() => {
    const validBusinessLines = businessLineOptions.map((opt) => opt.value)
    if (!isValueStillValid(selectedBusinessLine, validBusinessLines)) {
      setSelectedBusinessLine('')
    }
  }, [businessLineOptions])

  useEffect(() => {
    const validCompanies = companyOptions.map((opt) => opt.value)
    if (!isValueStillValid(selectedCompany, validCompanies)) {
      setSelectedCompany('')
    }
  }, [companyOptions])

  useEffect(() => {
    const validJobTitles = jobTitleOptions.map((opt) => opt.value)
    if (!isValueStillValid(selectedJobTitle, validJobTitles)) {
      setSelectedJobTitle('')
    }
  }, [jobTitleOptions])

  // Combined search + filter + sort
  const filteredAndSortedContacts = useMemo(() => {
    let result = [...contactData]

    // 1. SEARCH (including Business Line names)
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      result = result.filter((contact) => {
        // Search full name (combine first + last, may be undefined in practice)
        const fullName = combineSearchValues([contact.firstName, contact.lastName])
        if (fullName.includes(searchLower)) return true

        // Search company name
        if (contact.companyId) {
          const company = companyMap[contact.companyId]
          if (normalizeSearchValue(company?.name).includes(searchLower)) return true
        }

        // Search job title
        if (normalizeSearchValue(contact.jobTitle).includes(searchLower)) return true

        // Search email
        if (normalizeSearchValue(contact.email).includes(searchLower)) return true

        // Search phone
        if (normalizeSearchValue(contact.phone).includes(searchLower)) return true

        // Search Business Line names
        if (contact.businessLineNames.some((blName) => normalizeSearchValue(blName).includes(searchLower))) {
          return true
        }

        return false
      })
    }

    // 2. APPLY ALL FILTERS
    result = applySingleFilter(result, 'businessLine', selectedBusinessLine)
    result = applySingleFilter(result, 'company', selectedCompany)
    result = applySingleFilter(result, 'jobTitle', selectedJobTitle)

    // 3. SORT
    if (selectedSort) {
      result.sort((a, b) => {
        switch (selectedSort) {
          case 'name-asc':
            const fullNameA = combineSearchValues([a.firstName, a.lastName])
            const fullNameB = combineSearchValues([b.firstName, b.lastName])
            return compareStringsAsc(fullNameA, fullNameB)
          case 'name-desc':
            const fullNameA2 = combineSearchValues([a.firstName, a.lastName])
            const fullNameB2 = combineSearchValues([b.firstName, b.lastName])
            return compareStringsDesc(fullNameA2, fullNameB2)
          case 'company-asc':
            const companyA = a.companyId ? companyMap[a.companyId]?.name : ''
            const companyB = b.companyId ? companyMap[b.companyId]?.name : ''
            return compareStringsAsc(companyA, companyB)
          case 'jobtitle-asc':
            return compareStringsAsc(a.jobTitle, b.jobTitle)
          default:
            return 0
        }
      })
    }

    return result
  }, [contactData, search, selectedBusinessLine, selectedCompany, selectedJobTitle, selectedSort, companyMap])

  // Reset function
  const handleReset = () => {
    setSearch('')
    setSelectedBusinessLine('')
    setSelectedCompany('')
    setSelectedJobTitle('')
    setSelectedSort('')
  }

  // Check if any filters are active
  const hasActiveFilters = search || selectedBusinessLine || selectedCompany || selectedJobTitle || selectedSort

  // Sort options
  const sortOptions = [
    { value: '', label: 'Tri par défaut' },
    { value: 'name-asc', label: 'Nom A→Z' },
    { value: 'name-desc', label: 'Nom Z→A' },
    { value: 'company-asc', label: 'Entreprise A→Z' },
    { value: 'jobtitle-asc', label: 'Fonction A→Z' },
  ]

  return (
    <div className="space-y-6">
      {/* Search and View Toggle */}
      <SearchViewToolbar
        searchPlaceholder="Rechercher un contact..."
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
            label: 'Entreprise',
            value: selectedCompany,
            options: companyOptions,
            onChange: setSelectedCompany,
          },
          {
            label: 'Fonction',
            value: selectedJobTitle,
            options: jobTitleOptions,
            onChange: setSelectedJobTitle,
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
          ? `${filteredAndSortedContacts.length} / ${contacts.length} contact${filteredAndSortedContacts.length !== 1 ? 's' : ''}`
          : `${filteredAndSortedContacts.length} contact${filteredAndSortedContacts.length !== 1 ? 's' : ''}`}
      </div>

      {/* Empty State */}
      {filteredAndSortedContacts.length === 0 && (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <p className="text-text-muted text-lg">
              {hasActiveFilters ? 'Aucun contact trouvé.' : 'Aucun contact pour le moment'}
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
      {view === 'grid' && filteredAndSortedContacts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedContacts.map((contact) => {
            const company = contact.companyId ? companyMap[contact.companyId] : null

            return (
              <Link key={contact.id} href={`/contacts/${contact.id}`}>
                <Card className="hover:border-accent/50 transition-all cursor-pointer">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {contact.firstName} {contact.lastName}
                      </h3>

                      {/* Business Line Badges */}
                      {contact.businessLineNames.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {contact.businessLineNames.map((blName, index) => (
                            <Badge key={index} variant="accent" className="text-xs">
                              {blName}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {contact.jobTitle && (
                      <p className="text-text-muted text-sm">{contact.jobTitle}</p>
                    )}

                    {company && (
                      <p className="text-text-muted text-sm">{company.name}</p>
                    )}

                    <div className="space-y-1 text-xs text-text-muted">
                      {contact.email && <div>{contact.email}</div>}
                      {(contact.phone || company?.phone) && (
                        <div className="flex items-center gap-1.5">
                          <span>{contact.phone || company?.phone}</span>
                          {contact.phone ? (
                            <span className="text-[10px] text-text-muted/60">· Direct</span>
                          ) : (
                            <span className="text-[10px] text-text-muted/60">· Standard</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && filteredAndSortedContacts.length > 0 && (
        <div className="bg-card-bg border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-xs text-text-muted uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">
                  Business Lines
                </th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Entreprise</th>
                <th className="px-4 py-3 font-medium hidden xl:table-cell">Fonction</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Email</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedContacts.map((contact) => {
                const company = contact.companyId ? companyMap[contact.companyId] : null

                return (
                  <tr
                    key={contact.id}
                    className="border-b border-border last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => (window.location.href = `/contacts/${contact.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {contact.firstName} {contact.lastName}
                      </div>
                      {contact.jobTitle && (
                        <div className="text-xs text-text-muted mt-0.5 lg:hidden">
                          {contact.jobTitle}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {contact.businessLineNames.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {contact.businessLineNames.map((blName, index) => (
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
                        {company?.name || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <div className="text-sm text-text-muted">
                        {contact.jobTitle || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="text-sm text-text-muted truncate max-w-xs">
                        {contact.email || '—'}
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
