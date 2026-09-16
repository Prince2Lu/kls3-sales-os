'use client'

// Work Mode Filters component
// For COLD_CALL Business Lines: displays both pre-RDV and post-RDV blocks
// For DIRECT_OPPORTUNITY Business Lines: displays only opportunity stages

import type { BusinessLine, Owner, CallStatus, Stage } from '@/types/domain'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface WorkFiltersProps {
  businessLines: BusinessLine[]
  selectedBusinessLineCode: string | null
  selectedStatus: string | null
  selectedOwner: Owner | 'all'
  availableStatuses: {
    preRDV: readonly CallStatus[]
    postRDV: readonly Stage[]
  }
  currentOwner: Owner
  isColdCallBusinessLine: boolean
  onFilterChange: (
    businessLineCode: string | null,
    status: string | null,
    owner: Owner | 'all'
  ) => void
}

export function WorkFilters({
  businessLines,
  selectedBusinessLineCode,
  selectedStatus,
  selectedOwner,
  availableStatuses,
  currentOwner,
  isColdCallBusinessLine,
  onFilterChange,
}: WorkFiltersProps) {
  // Handle Business Line selection
  function handleBusinessLineSelect(code: string) {
    // Reset status when BL changes (different modes have different statuses)
    onFilterChange(code, null, selectedOwner)
  }

  // Handle Status selection
  function handleStatusSelect(status: string) {
    onFilterChange(selectedBusinessLineCode, status, selectedOwner)
  }

  // Handle Owner selection
  function handleOwnerSelect(owner: Owner | 'all') {
    onFilterChange(selectedBusinessLineCode, selectedStatus, owner)
  }

  // Check if statuses are available
  const hasStatuses = availableStatuses.preRDV.length > 0 || availableStatuses.postRDV.length > 0

  return (
    <Card className="p-6 space-y-6">
      {/* Business Line Selection */}
      <div>
        <label className="text-sm font-medium text-text-primary block mb-3">
          Business Line
        </label>
        <div className="flex flex-wrap gap-2">
          {businessLines
            .filter((bl) => bl.active)
            .map((bl) => (
              <button
                key={bl.id}
                onClick={() => handleBusinessLineSelect(bl.code)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedBusinessLineCode === bl.code
                    ? 'bg-accent text-white'
                    : 'bg-card-bg border border-border text-text-primary hover:border-accent'
                }`}
              >
                {bl.name}
              </button>
            ))}
        </div>
      </div>

      {/* Status Selection (only if BL selected) */}
      {selectedBusinessLineCode && hasStatuses && (
        <div>
          <label className="text-sm font-medium text-text-primary block mb-3">
            Blocs de travail
          </label>

          {/* Pre-RDV blocks (if Business Line uses prospecting mode) */}
          {isColdCallBusinessLine && availableStatuses.preRDV.length > 0 && (
            <div className="space-y-2 mb-4">
              <div className="text-xs text-text-muted font-medium uppercase tracking-wide">
                Prospection
              </div>
              <div className="flex flex-wrap gap-2">
                {availableStatuses.preRDV.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusSelect(status)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedStatus === status
                        ? 'bg-accent text-white'
                        : 'bg-card-bg border border-border text-text-primary hover:border-accent'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Post-RDV blocks (for COLD_CALL BLs) or all stages (for DIRECT_OPPORTUNITY BLs) */}
          {availableStatuses.postRDV.length > 0 && (
            <div className="space-y-2">
              {isColdCallBusinessLine && (
                <div className="text-xs text-text-muted font-medium uppercase tracking-wide">
                  Commercial
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {availableStatuses.postRDV.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusSelect(status)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedStatus === status
                        ? 'bg-accent text-white'
                        : 'bg-card-bg border border-border text-text-primary hover:border-accent'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Owner Selection */}
      <div>
        <label className="text-sm font-medium text-text-primary block mb-3">
          Commercial
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleOwnerSelect(currentOwner)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedOwner === currentOwner
                ? 'bg-accent text-white'
                : 'bg-card-bg border border-border text-text-primary hover:border-accent'
            }`}
          >
            Moi ({currentOwner})
          </button>
          <button
            onClick={() => handleOwnerSelect('Eric')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedOwner === 'Eric'
                ? 'bg-accent text-white'
                : 'bg-card-bg border border-border text-text-primary hover:border-accent'
            }`}
          >
            Eric
          </button>
          <button
            onClick={() => handleOwnerSelect('Lilian')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedOwner === 'Lilian'
                ? 'bg-accent text-white'
                : 'bg-card-bg border border-border text-text-primary hover:border-accent'
            }`}
          >
            Lilian
          </button>
          <button
            onClick={() => handleOwnerSelect('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedOwner === 'all'
                ? 'bg-accent text-white'
                : 'bg-card-bg border border-border text-text-primary hover:border-accent'
            }`}
          >
            Tous
          </button>
        </div>
      </div>

      {/* Active filter summary */}
      {selectedBusinessLineCode && selectedStatus && (
        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-muted">Mode actif :</span>
            <Badge variant="accent">
              {businessLines.find((bl) => bl.code === selectedBusinessLineCode)?.name}
            </Badge>
            <span className="text-text-muted">→</span>
            <Badge variant="default">{selectedStatus}</Badge>
            {selectedOwner !== currentOwner && (
              <>
                <span className="text-text-muted">→</span>
                <Badge variant="muted">
                  {selectedOwner === 'all' ? 'Tous' : selectedOwner}
                </Badge>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
