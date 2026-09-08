'use client'

// Kanban Column component for Pipeline (Phase 3)

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { OpportunityQuickView } from './opportunity-quick-view'

interface KanbanColumnProps {
  stage: Stage
  opportunities: Opportunity[]
  businessLines: Record<string, BusinessLine>
  tasksMap: Record<string, Task[]>
  stageHistoryMap: Record<string, StageHistory>
  companiesMap: Record<string, Company>
  contactsMap: Record<string, Contact>
  activitiesMap: Record<string, Activity[]>
}

export function KanbanColumn({
  stage,
  opportunities,
  businessLines,
  tasksMap,
  stageHistoryMap,
  companiesMap,
  contactsMap,
  activitiesMap,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: stage,
  })

  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null)

  const opportunityIds = opportunities.map((o) => o.id)

  const selectedOpportunity = selectedOpportunityId
    ? opportunities.find((o) => o.id === selectedOpportunityId)
    : null

  const selectedCompany = selectedOpportunity?.companyId
    ? companiesMap[selectedOpportunity.companyId]
    : null

  const selectedContact = selectedOpportunity?.primaryContactId
    ? contactsMap[selectedOpportunity.primaryContactId]
    : null

  const selectedBusinessLine = selectedOpportunity
    ? businessLines[selectedOpportunity.businessLineId]
    : null

  const selectedLastActivity = selectedOpportunity
    ? activitiesMap[selectedOpportunity.id]?.[0] || null
    : null

  const selectedNextTask = selectedOpportunity
    ? tasksMap[selectedOpportunity.id]?.sort((a, b) => {
        if (!a.dueAt) return 1
        if (!b.dueAt) return -1
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      })[0] || null
    : null

  return (
    <div className="flex-shrink-0 w-[320px]">
      <div className="mb-3 sticky top-0 bg-background py-2 z-10">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{stage}</h3>
          <Badge variant="muted">{opportunities.length}</Badge>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className="space-y-3 min-h-[200px] pb-4"
      >
        <SortableContext
          items={opportunityIds}
          strategy={verticalListSortingStrategy}
        >
          {opportunities.map((opportunity) => {
            const nextTask = tasksMap[opportunity.id]?.sort((a, b) => {
              if (!a.dueAt) return 1
              if (!b.dueAt) return -1
              return (
                new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
              )
            })[0]

            return (
              <DraggableCard
                key={opportunity.id}
                opportunity={opportunity}
                businessLine={businessLines[opportunity.businessLineId]}
                nextTask={nextTask}
                stageHistory={stageHistoryMap[opportunity.id]}
                onCardClick={() => setSelectedOpportunityId(opportunity.id)}
              />
            )
          })}
        </SortableContext>
      </div>

      {/* Quick View Drawer */}
      {selectedOpportunity && (
        <OpportunityQuickView
          opportunity={selectedOpportunity}
          company={selectedCompany || null}
          contact={selectedContact || null}
          businessLine={selectedBusinessLine || null}
          lastActivity={selectedLastActivity}
          nextTask={selectedNextTask}
          open={!!selectedOpportunityId}
          onClose={() => setSelectedOpportunityId(null)}
        />
      )}
    </div>
  )
}

function DraggableCard({
  opportunity,
  businessLine,
  nextTask,
  stageHistory,
  onCardClick,
}: {
  opportunity: Opportunity
  businessLine?: BusinessLine
  nextTask?: Task
  stageHistory?: StageHistory
  onCardClick: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Calculate days in stage from most recent stage change
  // Fallback to updatedAt if no stage history exists
  const stageStartDate = stageHistory
    ? new Date(stageHistory.changedAt)
    : new Date(opportunity.updatedAt)

  const daysInStage = Math.floor(
    (Date.now() - stageStartDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className="cursor-grab active:cursor-grabbing hover:border-accent/50 transition-all"
        onClick={(e) => {
          // Only trigger click if not dragging
          if (!isDragging) {
            e.stopPropagation()
            onCardClick()
          }
        }}
      >
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm line-clamp-2 cursor-pointer">
              {opportunity.name}
            </h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {businessLine && (
                <Badge variant="accent">
                  {businessLine.name}
                </Badge>
              )}
              {opportunity.priority && (
                <Badge
                  variant={
                    opportunity.priority === 'HIGH' ? 'accent' :
                    opportunity.priority === 'MEDIUM' ? 'default' :
                    'muted'
                  }
                  className="text-xs"
                >
                  {opportunity.priority === 'HIGH' ? 'A · HIGH' :
                   opportunity.priority === 'MEDIUM' ? 'B · MEDIUM' :
                   'C · LOW'}
                </Badge>
              )}
            </div>
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
    </div>
  )
}
