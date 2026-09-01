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
} from '@/types/domain'
import { updateOpportunityStage } from './actions'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KanbanColumn } from './kanban-column'

interface PipelineBoardProps {
  opportunities: Opportunity[]
  businessLines: BusinessLine[]
  tasks: Task[]
  stageHistory: StageHistory[]
  stages: readonly Stage[]
}

export function PipelineBoard({
  opportunities,
  businessLines,
  tasks,
  stageHistory,
  stages,
}: PipelineBoardProps) {
  const router = useRouter()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Create lookup maps
  const blMap = useMemo(
    () => Object.fromEntries(businessLines.map((bl) => [bl.id, bl])),
    [businessLines]
  )

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

  // Group opportunities by stage
  const opportunitiesByStage = useMemo(() => {
    const grouped: Record<string, Opportunity[]> = {}
    stages.forEach((stage) => {
      grouped[stage] = []
    })
    opportunities.forEach((opp) => {
      if (grouped[opp.stage]) {
        grouped[opp.stage].push(opp)
      }
    })
    return grouped
  }, [opportunities, stages])

  const sensors = useSensors(
    useSensor(PointerSensor),
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
    const newStage = over.id as Stage

    // Find the opportunity
    const opportunity = opportunities.find((o) => o.id === opportunityId)
    if (!opportunity) return

    // If stage hasn't changed, do nothing
    if (opportunity.stage === newStage) return

    // Update stage
    setIsUpdating(true)
    const result = await updateOpportunityStage(
      opportunityId,
      newStage,
      'Eric' // TODO: Get from auth context
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
    <div className="relative">
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
