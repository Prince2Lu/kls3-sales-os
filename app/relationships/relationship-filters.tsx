// Relationship commercial filters (Phase 3)
// Client component for filtering relationships

'use client'

import { Badge } from '@/components/ui/badge'
import type {
  RelationshipStatus,
  RelationshipImportance,
  RelationshipType,
} from '@/types/domain'

interface RelationshipFiltersProps {
  selectedStatus: string
  selectedImportance: string
  selectedType: string
  selectedHealth: string
  selectedIntroducer: string
  onStatusChange: (status: string) => void
  onImportanceChange: (importance: string) => void
  onTypeChange: (type: string) => void
  onHealthChange: (health: string) => void
  onIntroducerChange: (introducer: string) => void
}

export function RelationshipFilters({
  selectedStatus,
  selectedImportance,
  selectedType,
  selectedHealth,
  selectedIntroducer,
  onStatusChange,
  onImportanceChange,
  onTypeChange,
  onHealthChange,
  onIntroducerChange,
}: RelationshipFiltersProps) {
  const statuses: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Action prévue', label: 'Action prévue' },
    { value: 'En discussion', label: 'En discussion' },
    { value: 'À activer', label: 'À activer' },
    { value: 'Dormant', label: 'Dormant' },
    { value: 'Clos', label: 'Clos' },
  ]

  const importances: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'Tous' },
    { value: 'Haute', label: 'Haute' },
    { value: 'Normale', label: 'Normale' },
    { value: 'Faible', label: 'Faible' },
  ]

  const types: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'Tous' },
    { value: 'Réseau', label: 'Réseau' },
    { value: 'Prescripteur', label: 'Prescripteur' },
    { value: 'Apporteur', label: 'Apporteur' },
    { value: 'Partenaire', label: 'Partenaire' },
    { value: 'Institution', label: 'Institution' },
    { value: 'Contact stratégique', label: 'Contact stratégique' },
    { value: 'Autre', label: 'Autre' },
  ]

  const healthOptions: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'Tous' },
    { value: 'URGENT', label: 'Urgent' },
    { value: 'NEEDS_ATTENTION', label: 'À suivre' },
    { value: 'HEALTHY', label: 'Saine' },
    { value: 'INACTIVE', label: 'Inactive' },
  ]

  const introducerOptions: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'Tous' },
    { value: 'ACTIVE_INTRODUCER', label: 'Apporteurs actifs' },
    { value: 'SUCCESSFUL_INTRODUCER', label: 'Apporteurs avec signature' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Status */}
        <div>
          <label className="text-xs text-text-muted mb-2 block">Statut</label>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Importance */}
        <div>
          <label className="text-xs text-text-muted mb-2 block">
            Importance
          </label>
          <select
            value={selectedImportance}
            onChange={(e) => onImportanceChange(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {importances.map((importance) => (
              <option key={importance.value} value={importance.value}>
                {importance.label}
              </option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="text-xs text-text-muted mb-2 block">Type</label>
          <select
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {types.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Health */}
        <div>
          <label className="text-xs text-text-muted mb-2 block">Santé</label>
          <select
            value={selectedHealth}
            onChange={(e) => onHealthChange(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {healthOptions.map((health) => (
              <option key={health.value} value={health.value}>
                {health.label}
              </option>
            ))}
          </select>
        </div>

        {/* Introducer */}
        <div>
          <label className="text-xs text-text-muted mb-2 block">
            Apporteur
          </label>
          <select
            value={selectedIntroducer}
            onChange={(e) => onIntroducerChange(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {introducerOptions.map((introducer) => (
              <option key={introducer.value} value={introducer.value}>
                {introducer.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
