'use client'

// Work Mode client component - filters and displays work blocks
// Supports both pre-RDV (COLD_CALL_TARGETS) and post-RDV (OPPORTUNITIES) blocks

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type {
  ColdCallTarget,
  Opportunity,
  BusinessLine,
  Company,
  Contact,
  Activity,
  Task,
  Owner,
  CallStatus,
  Stage,
} from '@/types/domain'
import { WorkFilters } from './work-filters'
import { WorkList } from './work-list'
import { isColdCallBusinessLine } from '@/lib/utils/prospecting-mode'

interface WorkModeProps {
  targets: ColdCallTarget[]
  opportunities: Opportunity[]
  businessLines: BusinessLine[]
  companies: Company[]
  contacts: Contact[]
  activities: Activity[]
  tasks: Task[]
  currentOwner: Owner
}

// Pre-RDV call statuses (for COLD_CALL_TARGETS)
const PRE_RDV_STATUSES: CallStatus[] = [
  'À appeler',
  'À rappeler',
  'Email Flow',
  'Mauvais numéro',
  'Pas intéressé',
  'RDV booké',
]

// Post-RDV opportunity stages (for OPPORTUNITIES from converted targets or DIRECT_OPPORTUNITY BLs)
const POST_RDV_STAGES: Stage[] = [
  'RDV',
  'Opportunité',
  'Proposition',
  'Gagné',
  'Perdu',
]

// All opportunity stages for DIRECT_OPPORTUNITY business lines
const ALL_OPPORTUNITY_STAGES: Stage[] = [
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

// Type to distinguish between status types
type StatusType = 'PRE_RDV' | 'POST_RDV'

// Determine if a status is a CallStatus (pre-RDV) or Stage (post-RDV)
function getStatusType(status: string): StatusType {
  if (PRE_RDV_STATUSES.includes(status as CallStatus)) {
    return 'PRE_RDV'
  }
  return 'POST_RDV'
}

export function WorkMode({
  targets,
  opportunities,
  businessLines,
  companies,
  contacts,
  activities,
  tasks,
  currentOwner,
}: WorkModeProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get filters from URL or defaults
  const urlBusinessLineCode = searchParams.get('bl')
  const urlStatus = searchParams.get('status')
  const urlOwner = searchParams.get('owner')

  // Selected Business Line (by code)
  const [selectedBusinessLineCode, setSelectedBusinessLineCode] = useState<string | null>(
    urlBusinessLineCode
  )

  // Selected Status (CallStatus or Stage)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(urlStatus)

  // Selected Owner (filter by owner or 'all')
  const [selectedOwner, setSelectedOwner] = useState<Owner | 'all'>(
    (urlOwner as Owner) || currentOwner
  )

  // Find selected Business Line
  const selectedBusinessLine = useMemo(
    () => businessLines.find((bl) => bl.code === selectedBusinessLineCode) || null,
    [businessLines, selectedBusinessLineCode]
  )

  // Determine if selected BL uses COLD_CALL prospecting mode
  const isColdCallBusinessLine_ = selectedBusinessLine
    ? isColdCallBusinessLine(selectedBusinessLine)
    : false

  // Available statuses based on Business Line prospecting mode
  const availableStatuses = useMemo((): {
    preRDV: readonly CallStatus[]
    postRDV: readonly Stage[]
  } => {
    if (!selectedBusinessLine) {
      return {
        preRDV: [],
        postRDV: [],
      }
    }

    if (isColdCallBusinessLine_) {
      // COLD_CALL Business Lines: offer both pre-RDV (targets) and post-RDV (opportunities) blocks
      return {
        preRDV: PRE_RDV_STATUSES,
        postRDV: POST_RDV_STAGES,
      }
    } else {
      // DIRECT_OPPORTUNITY Business Lines: only opportunity stages
      return {
        preRDV: [],
        postRDV: ALL_OPPORTUNITY_STAGES,
      }
    }
  }, [selectedBusinessLine, isColdCallBusinessLine_])

  // Determine which source to use based on selected status
  const statusType = selectedStatus ? getStatusType(selectedStatus) : null

  // Create lookup maps for performance
  const companiesMap = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies]
  )

  const contactsMap = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.id, c])),
    [contacts]
  )

  const blMap = useMemo(
    () => Object.fromEntries(businessLines.map((bl) => [bl.id, bl])),
    [businessLines]
  )

  // Group activities by target/opportunity
  const activitiesByEntityId = useMemo(() => {
    const map: Record<string, Activity[]> = {}

    activities.forEach((activity) => {
      // Group by coldCallTargetId OR opportunityId
      const key = activity.coldCallTargetId || activity.opportunityId
      if (key) {
        if (!map[key]) map[key] = []
        map[key].push(activity)
      }
    })

    // Sort by date desc
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    })

    return map
  }, [activities])

  // Group tasks by target/opportunity
  const tasksByEntityId = useMemo(() => {
    const map: Record<string, Task[]> = {}

    tasks.forEach((task) => {
      const key = task.coldCallTargetId || task.opportunityId
      if (key) {
        if (!map[key]) map[key] = []
        map[key].push(task)
      }
    })

    return map
  }, [tasks])

  // Filter items based on selections
  const filteredItems = useMemo(() => {
    if (!selectedBusinessLine || !selectedStatus || !statusType) {
      return []
    }

    const blId = selectedBusinessLine.id

    if (statusType === 'PRE_RDV') {
      // PRE_RDV: filter COLD_CALL_TARGETS by BL + CallStatus + Owner
      // Exclude targets that have been converted to opportunities (opportunityId != null)
      return targets.filter((target) => {
        const matchesBL = target.businessLineId === blId
        const matchesStatus = target.callStatus === selectedStatus
        const matchesOwner = selectedOwner === 'all' || target.owner === selectedOwner
        const notConverted = !target.opportunityId // Anti-doublon: exclude converted targets

        return matchesBL && matchesStatus && matchesOwner && notConverted
      })
    } else {
      // POST_RDV: filter OPPORTUNITIES by BL + Stage + Owner
      return opportunities.filter((opp) => {
        const matchesBL = opp.businessLineId === blId
        const matchesStatus = opp.stage === selectedStatus
        const matchesOwner = selectedOwner === 'all' || opp.owner === selectedOwner

        return matchesBL && matchesStatus && matchesOwner
      })
    }
  }, [
    selectedBusinessLine,
    selectedStatus,
    selectedOwner,
    statusType,
    targets,
    opportunities,
  ])

  // Update URL when filters change
  function updateFilters(
    businessLineCode: string | null,
    status: string | null,
    owner: Owner | 'all'
  ) {
    setSelectedBusinessLineCode(businessLineCode)
    setSelectedStatus(status)
    setSelectedOwner(owner)

    // Update URL
    const params = new URLSearchParams()
    if (businessLineCode) params.set('bl', businessLineCode)
    if (status) params.set('status', status)
    if (owner !== currentOwner) params.set('owner', owner)

    router.push(`/work?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <WorkFilters
        businessLines={businessLines}
        selectedBusinessLineCode={selectedBusinessLineCode}
        selectedStatus={selectedStatus}
        selectedOwner={selectedOwner}
        availableStatuses={availableStatuses}
        currentOwner={currentOwner}
        isColdCallBusinessLine={isColdCallBusinessLine_}
        onFilterChange={updateFilters}
      />

      {/* Work List */}
      {selectedBusinessLine && selectedStatus && statusType ? (
        <WorkList
          items={filteredItems}
          businessLine={selectedBusinessLine}
          statusType={statusType}
          companiesMap={companiesMap}
          contactsMap={contactsMap}
          blMap={blMap}
          activitiesByEntityId={activitiesByEntityId}
          tasksByEntityId={tasksByEntityId}
          currentOwner={currentOwner}
        />
      ) : (
        <div className="text-center py-12 text-text-muted">
          <p>Sélectionnez une Business Line et un statut pour commencer</p>
        </div>
      )}
    </div>
  )
}
