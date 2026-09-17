'use client'

// Client-side relationships list with search, faceted filters, sorts, and view toggle
// Based on ContactsClient pattern for consistency

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SearchViewToolbar } from '@/components/ui/search-view-toolbar'
import { FilterToolbar } from '@/components/ui/filter-toolbar'
import { useViewPersistence } from '@/lib/hooks/use-view-persistence'
import { normalizeSearchValue } from '@/lib/utils/search'
import { compareStringsAsc, compareStringsDesc } from '@/lib/utils/sorting'
import { extractUniqueValues, isValueStillValid } from '@/lib/utils/faceted-filters'
import type { RelationshipWithPriority } from '@/lib/relationships/scoring'
import type { Contact, Company } from '@/types/domain'
import {
  getRelationshipHealth,
  getHealthBadgeVariant,
  getHealthLabel,
} from '@/lib/relationships/health'
import { Pencil } from 'lucide-react'

interface RelationshipsClientProps {
  relationships: RelationshipWithPriority[]
  contacts: Contact[]
  companies: Company[]
}

export function RelationshipsClient({
  relationships,
  contacts,
  companies,
}: RelationshipsClientProps) {
  const [search, setSearch] = useState('')
  const [view, setView, isClient] = useViewPersistence('kls3-relationships-view', 'grid')

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedImportance, setSelectedImportance] = useState('')
  const [selectedType, setSelectedType] = useState('')

  // Sort
  const [selectedSort, setSelectedSort] = useState('priority')

  // Create contact and company maps
  const contactMap = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.id, c])),
    [contacts]
  )

  const companyMap = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies]
  )

  // Helper: Apply a single filter
  const applySingleFilter = (records: RelationshipWithPriority[], key: string, value: string): RelationshipWithPriority[] => {
    if (!value) return records

    switch (key) {
      case 'status':
        return records.filter((r) => r.status === value)
      case 'importance':
        return records.filter((r) => r.importance === value)
      case 'type':
        return records.filter((r) => r.relationshipType === value)
      default:
        return records
    }
  }

  // Helper: Apply filters except one (for faceted filtering)
  const applyFiltersExcept = (excludeKey: string): RelationshipWithPriority[] => {
    let result = [...relationships]

    const filters = {
      status: selectedStatus,
      importance: selectedImportance,
      type: selectedType,
    }

    for (const [key, value] of Object.entries(filters)) {
      if (key !== excludeKey && value) {
        result = applySingleFilter(result, key, value)
      }
    }

    return result
  }

  // FACETED FILTER OPTIONS

  // Status options
  const statusOptions = useMemo(() => {
    const filtered = applyFiltersExcept('status')
    const availableStatuses = extractUniqueValues(filtered, (r) => r.status)

    return [
      { value: '', label: 'Tous' },
      { value: 'Actif', label: 'Actif' },
      { value: 'Action prévue', label: 'Action prévue' },
      { value: 'En discussion', label: 'En discussion' },
      { value: 'À activer', label: 'À activer' },
      { value: 'Dormant', label: 'Dormant' },
      { value: 'Clos', label: 'Clos' },
    ].filter(opt => opt.value === '' || availableStatuses.includes(opt.value))
  }, [relationships, selectedImportance, selectedType])

  // Importance options
  const importanceOptions = useMemo(() => {
    const filtered = applyFiltersExcept('importance')
    const availableImportances = extractUniqueValues(filtered, (r) => r.importance)

    return [
      { value: '', label: 'Toutes' },
      { value: 'Haute', label: 'Haute' },
      { value: 'Normale', label: 'Normale' },
      { value: 'Faible', label: 'Faible' },
    ].filter(opt => opt.value === '' || availableImportances.includes(opt.value))
  }, [relationships, selectedStatus, selectedType])

  // Type options
  const typeOptions = useMemo(() => {
    const filtered = applyFiltersExcept('type')
    const availableTypes = extractUniqueValues(filtered, (r) => r.relationshipType)

    return [
      { value: '', label: 'Tous' },
      { value: 'Réseau', label: 'Réseau' },
      { value: 'Prescripteur', label: 'Prescripteur' },
      { value: 'Apporteur', label: 'Apporteur' },
      { value: 'Partenaire', label: 'Partenaire' },
      { value: 'Institution', label: 'Institution' },
      { value: 'Contact stratégique', label: 'Contact stratégique' },
      { value: 'Autre', label: 'Autre' },
    ].filter(opt => opt.value === '' || availableTypes.includes(opt.value))
  }, [relationships, selectedStatus, selectedImportance])

  // Auto-reset invalid selections when filter options change
  useEffect(() => {
    const validStatuses = statusOptions.map((opt) => opt.value)
    if (!isValueStillValid(selectedStatus, validStatuses)) {
      setSelectedStatus('')
    }
  }, [statusOptions])

  useEffect(() => {
    const validImportances = importanceOptions.map((opt) => opt.value)
    if (!isValueStillValid(selectedImportance, validImportances)) {
      setSelectedImportance('')
    }
  }, [importanceOptions])

  useEffect(() => {
    const validTypes = typeOptions.map((opt) => opt.value)
    if (!isValueStillValid(selectedType, validTypes)) {
      setSelectedType('')
    }
  }, [typeOptions])

  // Combined search + filter + sort
  const filteredAndSorted = useMemo(() => {
    let result = [...relationships]

    // 1. SEARCH
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      result = result.filter((relationship) => {
        // Search name
        if (normalizeSearchValue(relationship.name).includes(searchLower)) return true

        // Search contact name
        if (relationship.contactId) {
          const contact = contactMap[relationship.contactId]
          const fullName = `${contact?.firstName || ''} ${contact?.lastName || ''}`.toLowerCase()
          if (fullName.includes(searchLower)) return true
        }

        // Search company name
        if (relationship.companyId) {
          const company = companyMap[relationship.companyId]
          if (normalizeSearchValue(company?.name).includes(searchLower)) return true
        }

        // Search objective
        if (normalizeSearchValue(relationship.objective).includes(searchLower)) return true

        // Search notes
        if (normalizeSearchValue(relationship.notes).includes(searchLower)) return true

        return false
      })
    }

    // 2. APPLY FILTERS
    result = applySingleFilter(result, 'status', selectedStatus)
    result = applySingleFilter(result, 'importance', selectedImportance)
    result = applySingleFilter(result, 'type', selectedType)

    // 3. SORT
    result.sort((a, b) => {
      switch (selectedSort) {
        case 'priority':
          return b.priorityScore - a.priorityScore

        case 'name-asc':
          return compareStringsAsc(a.name, b.name)

        case 'name-desc':
          return compareStringsDesc(a.name, b.name)

        case 'lastInteraction':
          if (!a.lastInteraction && !b.lastInteraction) return 0
          if (!a.lastInteraction) return 1
          if (!b.lastInteraction) return -1
          return (
            new Date(b.lastInteraction).getTime() -
            new Date(a.lastInteraction).getTime()
          )

        case 'nextAction':
          if (!a.nextActionDueAt && !b.nextActionDueAt) return 0
          if (!a.nextActionDueAt) return 1
          if (!b.nextActionDueAt) return -1
          return (
            new Date(a.nextActionDueAt).getTime() -
            new Date(b.nextActionDueAt).getTime()
          )

        case 'importance': {
          const importanceOrder = { Haute: 3, Normale: 2, Faible: 1 }
          return importanceOrder[b.importance] - importanceOrder[a.importance]
        }

        default:
          return 0
      }
    })

    return result
  }, [relationships, search, selectedStatus, selectedImportance, selectedType, selectedSort, contactMap, companyMap])

  // Reset function
  const handleReset = () => {
    setSearch('')
    setSelectedStatus('')
    setSelectedImportance('')
    setSelectedType('')
    setSelectedSort('priority')
  }

  // Check if any filters are active
  const hasActiveFilters = search || selectedStatus || selectedImportance || selectedType || (selectedSort && selectedSort !== 'priority')

  // Sort options
  const sortOptions = [
    { value: 'priority', label: 'Priorité (défaut)' },
    { value: 'name-asc', label: 'Nom A→Z' },
    { value: 'name-desc', label: 'Nom Z→A' },
    { value: 'lastInteraction', label: 'Dernière interaction' },
    { value: 'nextAction', label: 'Prochaine action' },
    { value: 'importance', label: 'Importance' },
  ]

  return (
    <div className="space-y-6">
      {/* Search and View Toggle */}
      <SearchViewToolbar
        searchPlaceholder="Rechercher une relation..."
        searchValue={search}
        onSearchChange={setSearch}
        view={view}
        onViewChange={setView}
      />

      {/* Filters and Sort */}
      <FilterToolbar
        filters={[
          {
            label: 'Statut',
            value: selectedStatus,
            options: statusOptions,
            onChange: setSelectedStatus,
          },
          {
            label: 'Importance',
            value: selectedImportance,
            options: importanceOptions,
            onChange: setSelectedImportance,
          },
          {
            label: 'Type',
            value: selectedType,
            options: typeOptions,
            onChange: setSelectedType,
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
          ? `${filteredAndSorted.length} / ${relationships.length} relation${filteredAndSorted.length !== 1 ? 's' : ''}`
          : `${filteredAndSorted.length} relation${filteredAndSorted.length !== 1 ? 's' : ''}`}
      </div>

      {/* Empty State */}
      {filteredAndSorted.length === 0 && (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <p className="text-text-muted text-lg">
              {hasActiveFilters ? 'Aucune relation trouvée.' : 'Aucune relation pour le moment'}
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
      {view === 'grid' && filteredAndSorted.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSorted.map((relationship) => {
            const health = getRelationshipHealth(relationship)
            const contact = relationship.contactId ? contactMap[relationship.contactId] : null
            const company = relationship.companyId ? companyMap[relationship.companyId] : null

            return (
              <div key={relationship.id} className="relative group">
                <Link href={`/relationships/${relationship.id}`}>
                  <Card className="hover:border-accent/50 transition-all cursor-pointer h-full">
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{relationship.name}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="accent" className="text-xs">
                            {relationship.relationshipType}
                          </Badge>
                          <Badge variant="muted" className="text-xs">
                            {relationship.importance}
                          </Badge>
                          <Badge variant={getHealthBadgeVariant(health)} className="text-xs">
                            {getHealthLabel(health)}
                          </Badge>
                        </div>
                      </div>

                      {contact && (
                        <p className="text-text-muted text-sm">
                          {contact.firstName} {contact.lastName}
                        </p>
                      )}

                      {company && (
                        <p className="text-text-muted text-sm">{company.name}</p>
                      )}

                      <div className="space-y-1 text-xs text-text-muted">
                        {relationship.lastInteraction ? (
                          <div>
                            Dernière interaction :{' '}
                            {new Date(relationship.lastInteraction).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </div>
                        ) : (
                          <div>Aucune activité enregistrée</div>
                        )}

                        {relationship.nextActionTaskId && relationship.nextActionDueAt ? (
                          <div>
                            Prochaine action :{' '}
                            {new Date(relationship.nextActionDueAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </div>
                        ) : (
                          <div>Aucune prochaine action</div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border text-xs text-accent font-medium">
                        Score de priorité : {relationship.priorityScore}
                      </div>
                    </div>
                  </Card>
                </Link>

                {/* Edit button overlay */}
                <Link
                  href={`/relationships/${relationship.id}/edit`}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && filteredAndSorted.length > 0 && (
        <div className="bg-card-bg border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-xs text-text-muted uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Contact</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Entreprise</th>
                <th className="px-4 py-3 font-medium hidden xl:table-cell">Type</th>
                <th className="px-4 py-3 font-medium hidden xl:table-cell">Statut</th>
                <th className="px-4 py-3 font-medium hidden 2xl:table-cell">Importance</th>
                <th className="px-4 py-3 font-medium hidden 2xl:table-cell">Dernière interaction</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((relationship) => {
                const health = getRelationshipHealth(relationship)
                const contact = relationship.contactId ? contactMap[relationship.contactId] : null
                const company = relationship.companyId ? companyMap[relationship.companyId] : null

                return (
                  <tr
                    key={relationship.id}
                    className="border-b border-border last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => (window.location.href = `/relationships/${relationship.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{relationship.name}</div>
                      <div className="flex items-center gap-1 mt-1 xl:hidden">
                        <Badge variant="accent" className="text-xs">
                          {relationship.relationshipType}
                        </Badge>
                        <Badge variant={getHealthBadgeVariant(health)} className="text-xs">
                          {getHealthLabel(health)}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-sm text-text-muted">
                        {contact ? `${contact.firstName} ${contact.lastName}` : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="text-sm text-text-muted">
                        {company?.name || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <Badge variant="accent" className="text-xs">
                        {relationship.relationshipType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <Badge variant="muted" className="text-xs">
                        {relationship.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden 2xl:table-cell">
                      <div className="text-sm text-text-muted">
                        {relationship.importance}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden 2xl:table-cell">
                      <div className="text-sm text-text-muted">
                        {relationship.lastInteraction
                          ? new Date(relationship.lastInteraction).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/relationships/${relationship.id}/edit`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
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
