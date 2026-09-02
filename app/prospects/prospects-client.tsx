'use client'

// Client-side prospects list with search, faceted filters, sorts, and view toggle

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SearchViewToolbar } from '@/components/ui/search-view-toolbar'
import { FilterToolbar } from '@/components/ui/filter-toolbar'
import { useViewPersistence } from '@/lib/hooks/use-view-persistence'
import { normalizeSearchValue, combineSearchValues } from '@/lib/utils/search'
import { compareStringsAsc, compareStringsDesc, compareNumbersDesc, compareNumbersAsc, compareDatesAsc } from '@/lib/utils/sorting'
import { extractUniqueValues, isValueStillValid } from '@/lib/utils/faceted-filters'
import type { Opportunity, BusinessLine, Company, Contact, Task, Stage, Owner, Priority } from '@/types/domain'

interface ProspectsClientProps {
  opportunities: Opportunity[]
  businessLines: BusinessLine[]
  companies: Company[]
  contacts: Contact[]
  tasks: Task[]
}

export function ProspectsClient({
  opportunities,
  businessLines,
  companies,
  contacts,
  tasks,
}: ProspectsClientProps) {
  const [search, setSearch] = useState('')
  const [view, setView, isClient] = useViewPersistence('kls3-prospects-view', 'grid')

  // Filters
  const [selectedBusinessLine, setSelectedBusinessLine] = useState('')
  const [selectedStage, setSelectedStage] = useState('')
  const [selectedOwner, setSelectedOwner] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('')

  // Sort
  const [selectedSort, setSelectedSort] = useState('')

  // Create lookup maps
  const blMap = useMemo(
    () => Object.fromEntries(businessLines.map((bl) => [bl.id, bl])),
    [businessLines]
  )
  const companyMap = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies]
  )
  const contactMap = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.id, c])),
    [contacts]
  )

  // Get next action for an opportunity (reuse existing logic)
  const getNextAction = (opportunityId: string) => {
    const oppTasks = tasks
      .filter((t) => t.opportunityId === opportunityId && t.status === 'TODO')
      .sort((a, b) => {
        if (!a.dueAt) return 1
        if (!b.dueAt) return -1
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      })

    return oppTasks[0] || null
  }

  // Helper: Apply a single filter to opportunities
  const applySingleFilter = (records: Opportunity[], key: string, value: string): Opportunity[] => {
    if (!value) return records

    switch (key) {
      case 'businessLine':
        return records.filter((opp) => opp.businessLineId === value)
      case 'stage':
        return records.filter((opp) => opp.stage === value)
      case 'owner':
        return records.filter((opp) => opp.owner === value)
      case 'priority':
        return records.filter((opp) => opp.priority === value)
      default:
        return records
    }
  }

  // Helper: Apply filters except one (for faceted filtering)
  const applyFiltersExcept = (excludeKey: string): Opportunity[] => {
    let result = [...opportunities]

    const filters = {
      businessLine: selectedBusinessLine,
      stage: selectedStage,
      owner: selectedOwner,
      priority: selectedPriority,
    }

    for (const [key, value] of Object.entries(filters)) {
      if (key !== excludeKey && value) {
        result = applySingleFilter(result, key, value)
      }
    }

    return result
  }

  // FACETED FILTER OPTIONS

  // Business Line options (derived after applying Stage + Owner + Priority)
  const businessLineOptions = useMemo(() => {
    const filtered = applyFiltersExcept('businessLine')
    const availableIds = extractUniqueValues(filtered, (opp) => opp.businessLineId)

    return [
      { value: '', label: 'Toutes' },
      ...businessLines
        .filter((bl) => availableIds.includes(bl.id))
        .map((bl) => ({ value: bl.id, label: bl.name }))
    ]
  }, [opportunities, selectedStage, selectedOwner, selectedPriority, businessLines])

  // Stage options (derived after applying Business Line + Owner + Priority)
  const stageOptions = useMemo(() => {
    const filtered = applyFiltersExcept('stage')
    const availableStages = extractUniqueValues(filtered, (opp) => opp.stage)

    const allStages = [
      'À prospecter',
      'Contacté',
      'Échange',
      'Qualifié',
      'RDV',
      'Opportunité',
      'Proposition',
      'Gagné',
      'Perdu',
    ]

    return [
      { value: '', label: 'Toutes' },
      ...allStages
        .filter((stage) => availableStages.includes(stage))
        .map((stage) => ({ value: stage, label: stage }))
    ]
  }, [opportunities, selectedBusinessLine, selectedOwner, selectedPriority])

  // Owner options (derived after applying Business Line + Stage + Priority)
  const ownerOptions = useMemo(() => {
    const filtered = applyFiltersExcept('owner')
    const availableOwners = extractUniqueValues(filtered, (opp) => opp.owner || '')

    const allOwners = ['Eric', 'Lilian']

    return [
      { value: '', label: 'Tous' },
      ...allOwners
        .filter((owner) => availableOwners.includes(owner))
        .map((owner) => ({ value: owner, label: owner }))
    ]
  }, [opportunities, selectedBusinessLine, selectedStage, selectedPriority])

  // Priority options (derived after applying Business Line + Stage + Owner)
  const priorityOptions = useMemo(() => {
    const filtered = applyFiltersExcept('priority')
    const availablePriorities = extractUniqueValues(filtered, (opp) => opp.priority || '')

    const allPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

    return [
      { value: '', label: 'Toutes' },
      ...allPriorities
        .filter((priority) => availablePriorities.includes(priority))
        .map((priority) => ({ value: priority, label: priority }))
    ]
  }, [opportunities, selectedBusinessLine, selectedStage, selectedOwner])

  // Auto-reset invalid selections when filter options change
  useEffect(() => {
    const validBusinessLines = businessLineOptions.map((opt) => opt.value)
    if (!isValueStillValid(selectedBusinessLine, validBusinessLines)) {
      setSelectedBusinessLine('')
    }
  }, [businessLineOptions])

  useEffect(() => {
    const validStages = stageOptions.map((opt) => opt.value)
    if (!isValueStillValid(selectedStage, validStages)) {
      setSelectedStage('')
    }
  }, [stageOptions])

  useEffect(() => {
    const validOwners = ownerOptions.map((opt) => opt.value)
    if (!isValueStillValid(selectedOwner, validOwners)) {
      setSelectedOwner('')
    }
  }, [ownerOptions])

  useEffect(() => {
    const validPriorities = priorityOptions.map((opt) => opt.value)
    if (!isValueStillValid(selectedPriority, validPriorities)) {
      setSelectedPriority('')
    }
  }, [priorityOptions])

  // Combined search + filter + sort
  const filteredAndSortedOpportunities = useMemo(() => {
    let result = [...opportunities]

    // 1. SEARCH
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      result = result.filter((opp) => {
        if (normalizeSearchValue(opp.name).includes(searchLower)) return true
        if (opp.companyId) {
          const company = companyMap[opp.companyId]
          if (normalizeSearchValue(company?.name).includes(searchLower)) return true
        }
        if (opp.primaryContactId) {
          const contact = contactMap[opp.primaryContactId]
          if (contact) {
            const fullName = combineSearchValues([contact.firstName, contact.lastName])
            if (fullName.includes(searchLower)) return true
          }
        }
        const bl = blMap[opp.businessLineId]
        if (normalizeSearchValue(bl?.name).includes(searchLower)) return true
        return false
      })
    }

    // 2. APPLY ALL FILTERS
    result = applySingleFilter(result, 'businessLine', selectedBusinessLine)
    result = applySingleFilter(result, 'stage', selectedStage)
    result = applySingleFilter(result, 'owner', selectedOwner)
    result = applySingleFilter(result, 'priority', selectedPriority)

    // 3. SORT
    if (selectedSort) {
      result.sort((a, b) => {
        switch (selectedSort) {
          case 'name-asc':
            return compareStringsAsc(a.name, b.name)
          case 'name-desc':
            return compareStringsDesc(a.name, b.name)
          case 'value-asc':
            return compareNumbersAsc(a.potentialValue, b.potentialValue)
          case 'value-desc':
            return compareNumbersDesc(a.potentialValue, b.potentialValue)
          case 'next-action':
            const nextA = getNextAction(a.id)
            const nextB = getNextAction(b.id)
            return compareDatesAsc(nextA?.dueAt, nextB?.dueAt)
          case 'stage':
            return compareStringsAsc(a.stage, b.stage)
          default:
            return 0
        }
      })
    }

    return result
  }, [opportunities, search, selectedBusinessLine, selectedStage, selectedOwner, selectedPriority, selectedSort, companyMap, contactMap, blMap, tasks])

  // Reset function
  const handleReset = () => {
    setSearch('')
    setSelectedBusinessLine('')
    setSelectedStage('')
    setSelectedOwner('')
    setSelectedPriority('')
    setSelectedSort('')
  }

  // Check if any filters are active
  const hasActiveFilters = search || selectedBusinessLine || selectedStage || selectedOwner || selectedPriority || selectedSort

  // Sort options
  const sortOptions = [
    { value: '', label: 'Tri par défaut' },
    { value: 'name-asc', label: 'Nom A→Z' },
    { value: 'name-desc', label: 'Nom Z→A' },
    { value: 'value-asc', label: 'Valeur croissante' },
    { value: 'value-desc', label: 'Valeur décroissante' },
    { value: 'next-action', label: 'Prochaine action la plus proche' },
    { value: 'stage', label: 'Étape' },
  ]

  return (
    <div className="space-y-6">
      {/* Search and View Toggle */}
      <SearchViewToolbar
        searchPlaceholder="Rechercher un prospect..."
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
            label: 'Étape',
            value: selectedStage,
            options: stageOptions,
            onChange: setSelectedStage,
          },
          {
            label: 'Owner',
            value: selectedOwner,
            options: ownerOptions,
            onChange: setSelectedOwner,
          },
          {
            label: 'Priorité',
            value: selectedPriority,
            options: priorityOptions,
            onChange: setSelectedPriority,
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
          ? `${filteredAndSortedOpportunities.length} / ${opportunities.length} opportunité${filteredAndSortedOpportunities.length !== 1 ? 's' : ''}`
          : `${filteredAndSortedOpportunities.length} opportunité${filteredAndSortedOpportunities.length !== 1 ? 's' : ''}`}
      </div>

      {/* Empty State */}
      {filteredAndSortedOpportunities.length === 0 && (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <p className="text-text-muted text-lg">
              {hasActiveFilters ? 'Aucun prospect trouvé.' : 'Aucun prospect pour le moment'}
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
      {view === 'grid' && filteredAndSortedOpportunities.length > 0 && (
        <div className="space-y-4">
          {filteredAndSortedOpportunities.map((opportunity) => {
            const businessLine = blMap[opportunity.businessLineId]

            return (
              <Link key={opportunity.id} href={`/prospects/${opportunity.id}`}>
                <Card className="hover:border-accent/50 transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg">{opportunity.name}</h3>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="default">{opportunity.stage}</Badge>
                          {businessLine && (
                            <Badge variant="accent">{businessLine.name}</Badge>
                          )}
                          {opportunity.priority && (
                            <Badge
                              variant={
                                opportunity.priority === 'URGENT' ||
                                opportunity.priority === 'HIGH'
                                  ? 'accent'
                                  : 'muted'
                              }
                            >
                              {opportunity.priority}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {opportunity.problem && (
                        <p className="text-text-muted text-sm line-clamp-2">
                          {opportunity.problem}
                        </p>
                      )}
                    </div>

                    <div className="text-right space-y-2">
                      {opportunity.potentialValue && (
                        <div className="text-lg font-semibold">
                          {opportunity.potentialValue.toLocaleString('fr-FR')} €
                        </div>
                      )}
                      <div className="text-text-muted text-xs">{opportunity.owner}</div>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && filteredAndSortedOpportunities.length > 0 && (
        <div className="bg-card-bg border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-xs text-text-muted uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Prospect</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Entreprise</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">
                  Business Line
                </th>
                <th className="px-4 py-3 font-medium">Étape</th>
                <th className="px-4 py-3 font-medium hidden xl:table-cell">
                  Prochaine action
                </th>
                <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">
                  Valeur
                </th>
                <th className="px-4 py-3 font-medium text-right">Owner</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedOpportunities.map((opportunity) => {
                const businessLine = blMap[opportunity.businessLineId]
                const company = opportunity.companyId
                  ? companyMap[opportunity.companyId]
                  : null
                const nextAction = getNextAction(opportunity.id)

                return (
                  <tr
                    key={opportunity.id}
                    className="border-b border-border last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => (window.location.href = `/prospects/${opportunity.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{opportunity.name}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-sm text-text-muted">
                        {company?.name || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {businessLine && (
                        <Badge variant="accent" className="text-xs">
                          {businessLine.name}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default" className="text-xs">
                        {opportunity.stage}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {nextAction ? (
                        <div className="text-sm text-text-muted">
                          {nextAction.type}
                          {nextAction.dueAt && (
                            <span className="text-xs ml-1">
                              {new Date(nextAction.dueAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-text-muted/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      {opportunity.potentialValue ? (
                        <div className="text-sm font-medium">
                          {opportunity.potentialValue.toLocaleString('fr-FR')} €
                        </div>
                      ) : (
                        <span className="text-xs text-text-muted/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-xs text-text-muted">{opportunity.owner}</div>
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
