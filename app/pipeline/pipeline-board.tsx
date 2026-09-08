'use client'

// Pipeline Kanban Board with drag-and-drop (Phase 3)

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
  Opportunity,
  BusinessLine,
  Task,
  Stage,
  StageHistory,
  Company,
  Contact,
  Activity,
} from '@/types/domain'
import { updateOpportunityStage } from './actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KanbanColumn } from './kanban-column'

interface PipelineBoardProps {
  opportunities: Opportunity[]
  businessLines: BusinessLine[]
  tasks: Task[]
  stageHistory: StageHistory[]
  companies: Company[]
  contacts: Contact[]
  activities: Activity[]
  stages: readonly Stage[]
  currentOwner: 'Eric' | 'Lilian'
}

export function PipelineBoard({
  opportunities,
  businessLines,
  tasks,
  stageHistory,
  companies,
  contacts,
  activities,
  stages,
  currentOwner,
}: PipelineBoardProps) {
  const router = useRouter()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [sortByBusinessLine, setSortByBusinessLine] = useState(false)
  const [selectedBusinessLineId, setSelectedBusinessLineId] = useState<string | null>(null)

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

  const activitiesMap = useMemo(() => {
    const map: Record<string, Activity[]> = {}
    activities.forEach((activity) => {
      if (activity.opportunityId) {
        if (!map[activity.opportunityId]) map[activity.opportunityId] = []
        map[activity.opportunityId].push(activity)
      }
    })
    // Sort activities by date desc for each opportunity
    Object.keys(map).forEach((oppId) => {
      map[oppId].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    })
    return map
  }, [activities])

  const tasksMap = useMemo(() => {
    const map: Record<string, Task[]> = {}
    tasks.forEach((task) => {
      if (task.opportunityId) {
        if (!map[task.opportunityId]) map[task.opportunityId] = []
        map[task.opportunityId].push(task)
      }
    })
    return map
  }, [tasks])

  // Create stage history map - get most recent entry for each opportunity
  const stageHistoryMap = useMemo(() => {
    const map: Record<string, StageHistory> = {}
    stageHistory.forEach((history) => {
      const oppId = history.opportunityId
      if (!map[oppId] || new Date(history.changedAt) > new Date(map[oppId].changedAt)) {
        map[oppId] = history
      }
    })
    return map
  }, [stageHistory])

  // Filter opportunities by Business Line
  const filteredOpportunities = useMemo(() => {
    if (!selectedBusinessLineId) return opportunities
    return opportunities.filter((opp) => opp.businessLineId === selectedBusinessLineId)
  }, [opportunities, selectedBusinessLineId])

  // Group opportunities by stage and optionally sort by Business Line
  const opportunitiesByStage = useMemo(() => {
    const grouped: Record<string, Opportunity[]> = {}
    stages.forEach((stage) => {
      grouped[stage] = []
    })
    filteredOpportunities.forEach((opp) => {
      if (grouped[opp.stage]) {
        grouped[opp.stage].push(opp)
      }
    })

    // Sort within each stage by Business Line if enabled
    if (sortByBusinessLine) {
      Object.keys(grouped).forEach((stage) => {
        grouped[stage].sort((a, b) => {
          const blA = blMap[a.businessLineId]?.name || ''
          const blB = blMap[b.businessLineId]?.name || ''
          return blA.localeCompare(blB)
        })
      })
    }

    return grouped
  }, [filteredOpportunities, stages, sortByBusinessLine, blMap])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Drag starts after 8px movement
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

    const opportunityId = active.id as string
    const overId = String(over.id)

    // Resolve target stage from over.id
    let targetStage: Stage | null = null

    // Check if over.id is directly a stage name
    if (stages.includes(overId as Stage)) {
      targetStage = overId as Stage
    } else {
      // over.id might be an opportunity card - find its stage
      const targetOpportunity = opportunities.find((opp) => opp.id === overId)
      if (targetOpportunity) {
        targetStage = targetOpportunity.stage
      }
    }

    if (!targetStage) return

    // Find the dragged opportunity
    const opportunity = opportunities.find((o) => o.id === opportunityId)
    if (!opportunity) return

    // If stage hasn't changed, do nothing
    if (opportunity.stage === targetStage) return

    // Update stage
    setIsUpdating(true)
    const result = await updateOpportunityStage(
      opportunityId,
      targetStage,
      currentOwner
    )
    setIsUpdating(false)

    if (result.success) {
      router.refresh()
    } else {
      alert('Erreur lors de la mise à jour')
    }
  }

  const activeOpportunity = activeId
    ? opportunities.find((o) => o.id === activeId)
    : null

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
                {bl.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Control */}
        <Button
          type="button"
          size="sm"
          variant={sortByBusinessLine ? 'primary' : 'ghost'}
          onClick={() => setSortByBusinessLine(!sortByBusinessLine)}
        >
          {sortByBusinessLine ? '✓ Trié par Business Line' : 'Trier par Business Line'}
        </Button>
      </div>

      {isUpdating && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
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
          {stages.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              opportunities={opportunitiesByStage[stage] || []}
              businessLines={blMap}
              tasksMap={tasksMap}
              stageHistoryMap={stageHistoryMap}
              companiesMap={companiesMap}
              contactsMap={contactsMap}
              activitiesMap={activitiesMap}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOpportunity && (
            <OpportunityCard
              opportunity={activeOpportunity}
              businessLine={blMap[activeOpportunity.businessLineId]}
              nextTask={
                tasksMap[activeOpportunity.id]?.sort((a, b) => {
                  if (!a.dueAt) return 1
                  if (!b.dueAt) return -1
                  return (
                    new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
                  )
                })[0]
              }
              stageHistory={stageHistoryMap[activeOpportunity.id]}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function OpportunityCard({
  opportunity,
  businessLine,
  nextTask,
  isDragging = false,
  stageHistory,
}: {
  opportunity: Opportunity
  businessLine?: BusinessLine
  nextTask?: Task
  isDragging?: boolean
  stageHistory?: StageHistory
}) {
  // Calculate days in stage from most recent stage change
  // Fallback to updatedAt if no stage history exists
  const stageStartDate = stageHistory
    ? new Date(stageHistory.changedAt)
    : new Date(opportunity.updatedAt)

  const daysInStage = Math.floor(
    (Date.now() - stageStartDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <Card
      className={`cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50 rotate-2 scale-105' : ''
      }`}
    >
      <div className="space-y-3">
        <div>
          <Link href={`/prospects/${opportunity.id}`} className="hover:text-accent">
            <h4 className="font-medium text-sm line-clamp-2">
              {opportunity.name}
            </h4>
          </Link>
          {businessLine && (
            <Badge variant="accent" className="mt-2">
              {businessLine.name}
            </Badge>
          )}
        </div>

        {opportunity.potentialValue && (
          <div className="text-accent font-semibold">
            {opportunity.potentialValue.toLocaleString('fr-FR')} €
          </div>
        )}

        {nextTask && (
          <div className="text-xs text-text-muted">
            <div>→ {nextTask.type}</div>
            {nextTask.dueAt && (
              <div>
                {new Date(nextTask.dueAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>{opportunity.owner}</span>
          <span>{daysInStage}j</span>
        </div>
      </div>
    </Card>
  )
}
