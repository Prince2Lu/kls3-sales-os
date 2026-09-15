'use client'

// Cold Call Kanban Board with drag-and-drop

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type {
  ColdCallTarget,
  BusinessLine,
  Company,
  Contact,
  Opportunity,
  CallStatus,
  Activity,
  Task,
} from '@/types/domain'
import { updateColdCallStatus, updateColdCallOpportunityStage } from './actions'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ColdCallColumn } from './cold-call-column'
import { CallbackModal } from './callback-modal'

interface ColdCallBoardProps {
  targets: ColdCallTarget[]
  businessLines: BusinessLine[]
  companies: Company[]
  contacts: Contact[]
  opportunities: Opportunity[]
  activities: Activity[]
  tasks: Task[]
  currentOwner: 'Eric' | 'Lilian'
}

// Call status columns (pre-opportunity)
const CALL_STATUSES: CallStatus[] = [
  'À appeler',
  'À rappeler',
  'Email Flow',
  'Mauvais numéro',
  'Pas intéressé',
  'RDV booké',
]

// Opportunity stages for post-RDV (displayed in cold call view)
const POST_RDV_STAGES = ['Gagné', 'Perdu'] as const

export function ColdCallBoard({
  targets,
  businessLines,
  companies,
  contacts,
  opportunities,
  activities,
  tasks,
  currentOwner,
}: ColdCallBoardProps) {
  const router = useRouter()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedBusinessLineId, setSelectedBusinessLineId] = useState<
    string | null
  >(null)

  // Callback modal state
  const [showCallbackModal, setShowCallbackModal] = useState(false)
  const [pendingCallbackTargetId, setPendingCallbackTargetId] = useState<
    string | null
  >(null)

  // Create lookup maps
  const blMap = useMemo(
    () => Object.fromEntries(businessLines.map((bl) => [bl.id, bl])),
    [businessLines]
  )

  const companiesMap = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies]
  )

  const contactsMap = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.id, c])),
    [contacts]
  )

  const opportunitiesMap = useMemo(
    () => Object.fromEntries(opportunities.map((o) => [o.id, o])),
    [opportunities]
  )

  // Group activities by coldCallTargetId for efficient access
  const activitiesByTargetId = useMemo(() => {
    const grouped: Record<string, typeof activities> = {}
    activities.forEach((activity) => {
      if (activity.coldCallTargetId) {
        if (!grouped[activity.coldCallTargetId]) {
          grouped[activity.coldCallTargetId] = []
        }
        grouped[activity.coldCallTargetId].push(activity)
      }
    })
    return grouped
  }, [activities])

  // Group tasks by coldCallTargetId for efficient access
  const tasksByTargetId = useMemo(() => {
    const grouped: Record<string, typeof tasks> = {}
    tasks.forEach((task) => {
      if (task.coldCallTargetId) {
        if (!grouped[task.coldCallTargetId]) {
          grouped[task.coldCallTargetId] = []
        }
        grouped[task.coldCallTargetId].push(task)
      }
    })
    return grouped
  }, [tasks])

  // Filter targets by Business Line
  const filteredTargets = useMemo(() => {
    if (!selectedBusinessLineId) return targets
    return targets.filter((t) => t.businessLineId === selectedBusinessLineId)
  }, [targets, selectedBusinessLineId])

  // Group targets by call status (pre-opportunity)
  const targetsByStatus = useMemo(() => {
    const grouped: Record<string, ColdCallTarget[]> = {}
    CALL_STATUSES.forEach((status) => {
      grouped[status] = []
    })

    filteredTargets.forEach((target) => {
      if (grouped[target.callStatus]) {
        grouped[target.callStatus].push(target)
      }
    })

    return grouped
  }, [filteredTargets])

  // Group targets with opportunities by stage (post-RDV: Gagné, Perdu)
  const targetsByStage = useMemo(() => {
    const grouped: Record<string, ColdCallTarget[]> = {
      Gagné: [],
      Perdu: [],
    }

    filteredTargets.forEach((target) => {
      if (target.opportunityId) {
        const opp = opportunitiesMap[target.opportunityId]
        if (opp && (opp.stage === 'Gagné' || opp.stage === 'Perdu')) {
          grouped[opp.stage].push(target)
        }
      }
    })

    return grouped
  }, [filteredTargets, opportunitiesMap])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const targetId = active.id as string
    const overId = String(over.id)

    // Find the dragged target
    const target = targets.find((t) => t.id === targetId)
    if (!target) return

    // Determine if dropping on a call status or stage column
    const isCallStatusColumn = CALL_STATUSES.includes(overId as CallStatus)
    const isStageColumn = POST_RDV_STAGES.includes(
      overId as (typeof POST_RDV_STAGES)[number]
    )

    if (isCallStatusColumn) {
      const newStatus = overId as CallStatus

      // If already in this status, do nothing
      if (target.callStatus === newStatus) return

      // Special handling for "À rappeler" - show modal
      if (newStatus === 'À rappeler') {
        setPendingCallbackTargetId(targetId)
        setShowCallbackModal(true)
        return
      }

      // Update status directly
      // changedBy is determined server-side from session
      setIsUpdating(true)
      const result = await updateColdCallStatus(targetId, newStatus)
      setIsUpdating(false)

      if (result.success) {
        router.refresh()
      } else {
        alert('Erreur lors de la mise à jour')
      }
    } else if (isStageColumn) {
      const newStage = overId as 'Gagné' | 'Perdu'

      // Must have an opportunity to move to Gagné/Perdu
      if (!target.opportunityId) {
        alert('Impossible de passer à Gagné/Perdu sans RDV booké')
        return
      }

      const opp = opportunitiesMap[target.opportunityId]
      if (!opp) return

      // If already in this stage, do nothing
      if (opp.stage === newStage) return

      // changedBy is determined server-side from session
      setIsUpdating(true)
      const result = await updateColdCallOpportunityStage(
        targetId,
        newStage
      )
      setIsUpdating(false)

      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || 'Erreur lors de la mise à jour')
      }
    }
  }

  async function handleCallbackConfirm(targetId: string, callbackDate: string) {
    setShowCallbackModal(false)
    setPendingCallbackTargetId(null)

    // changedBy is determined server-side from session
    setIsUpdating(true)
    const result = await updateColdCallStatus(targetId, 'À rappeler', {
      callbackDate,
    })
    setIsUpdating(false)

    if (result.success) {
      router.refresh()
    } else {
      alert('Erreur lors de la création du rappel')
    }
  }

  const activeTarget = activeId ? targets.find((t) => t.id === activeId) : null

  return (
    <div className="relative space-y-4">
      {/* Filters and Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Business Line Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-muted">Business Line:</label>
          <select
            value={selectedBusinessLineId || ''}
            onChange={(e) => setSelectedBusinessLineId(e.target.value || null)}
            className="px-3 py-1 bg-card-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Toutes</option>
            {businessLines.map((bl) => (
              <option key={bl.id} value={bl.id}>
                {bl.code === 'SACHA' ? 'Leverio' : bl.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isUpdating && (
        <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
          <div className="text-text-primary">Mise à jour...</div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {/* Call Status Columns */}
          {CALL_STATUSES.map((status) => (
            <ColdCallColumn
              key={status}
              id={status}
              title={status}
              targets={targetsByStatus[status] || []}
              companiesMap={companiesMap}
              contactsMap={contactsMap}
              blMap={blMap}
              activitiesByTargetId={activitiesByTargetId}
              tasksByTargetId={tasksByTargetId}
              currentOwner={currentOwner}
            />
          ))}

          {/* Gagné / Perdu Columns */}
          {POST_RDV_STAGES.map((stage) => (
            <ColdCallColumn
              key={stage}
              id={stage}
              title={stage}
              targets={targetsByStage[stage] || []}
              companiesMap={companiesMap}
              contactsMap={contactsMap}
              blMap={blMap}
              activitiesByTargetId={activitiesByTargetId}
              tasksByTargetId={tasksByTargetId}
              currentOwner={currentOwner}
              isStageColumn
            />
          ))}
        </div>

        <DragOverlay>{activeTarget && <div>Déplacement...</div>}</DragOverlay>
      </DndContext>

      {/* Callback Modal */}
      {showCallbackModal && pendingCallbackTargetId && (
        <CallbackModal
          onConfirm={(date) => handleCallbackConfirm(pendingCallbackTargetId, date)}
          onCancel={() => {
            setShowCallbackModal(false)
            setPendingCallbackTargetId(null)
          }}
        />
      )}
    </div>
  )
}
