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
import { ContactInfo } from '@/components/pipeline/contact-info'
import { CallCounter } from '@/components/pipeline/call-counter'
import { TaskSummary } from '@/components/pipeline/task-summary'
import { CreateTaskModal } from '@/components/pipeline/create-task-modal'
import { createManualTask } from '@/lib/actions/task-actions'
import { recordOpportunityCallActivity } from '@/lib/actions/call-actions'
import { StageChangeMenu } from './stage-change-menu'
import { updateOpportunityStage } from './actions'
import { useRouter } from 'next/navigation'
import { CallResultMenu } from '@/app/cold-call/call-result-menu'
import { CallbackModal } from '@/app/cold-call/callback-modal'

interface KanbanColumnProps {
  stage: Stage
  opportunities: Opportunity[]
  businessLines: Record<string, BusinessLine>
  tasksMap: Record<string, Task[]>
  stageHistoryMap: Record<string, StageHistory>
  companiesMap: Record<string, Company>
  contactsMap: Record<string, Contact>
  activitiesMap: Record<string, Activity[]>
  allStages: readonly Stage[]
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
  allStages,
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

            const company = opportunity.companyId
              ? companiesMap[opportunity.companyId]
              : undefined

            const contact = opportunity.primaryContactId
              ? contactsMap[opportunity.primaryContactId]
              : undefined

            return (
              <DraggableCard
                key={opportunity.id}
                opportunity={opportunity}
                company={company}
                contact={contact}
                businessLine={businessLines[opportunity.businessLineId]}
                activities={activitiesMap[opportunity.id] || []}
                tasks={tasksMap[opportunity.id] || []}
                nextTask={nextTask}
                stageHistory={stageHistoryMap[opportunity.id]}
                allStages={allStages}
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
  company,
  contact,
  businessLine,
  activities,
  tasks,
  nextTask,
  stageHistory,
  allStages,
  onCardClick,
}: {
  opportunity: Opportunity
  company?: Company
  contact?: Contact
  businessLine?: BusinessLine
  activities: Activity[]
  tasks: Task[]
  nextTask?: Task
  stageHistory?: StageHistory
  allStages: readonly Stage[]
  onCardClick: () => void
}) {
  const router = useRouter()
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [showCallMenu, setShowCallMenu] = useState(false)
  const [showCallbackModal, setShowCallbackModal] = useState(false)
  const [showStageMenu, setShowStageMenu] = useState(false)
  const [taskInitialType, setTaskInitialType] = useState<import('@/types/domain').TaskType | undefined>(undefined)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [isRecordingCall, setIsRecordingCall] = useState(false)
  const [isChangingStage, setIsChangingStage] = useState(false)

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

  async function handleCallResult(result: import('@/types/domain').ActivityResult) {
    setShowCallMenu(false)

    // CALLBACK requires date - show modal
    if (result === 'CALLBACK') {
      setShowCallbackModal(true)
      return
    }

    // Other results: record directly
    setIsRecordingCall(true)
    const response = await recordOpportunityCallActivity(
      opportunity.id,
      result,
      opportunity.primaryContactId || undefined
    )
    setIsRecordingCall(false)

    if (response.success) {
      router.refresh()

      // EMAIL_REQUESTED: propose task creation with EMAIL preselected
      if (result === 'EMAIL_REQUESTED') {
        setTaskInitialType('EMAIL')
        setShowCreateTaskModal(true)
      }
    } else {
      alert('Erreur lors de l\'enregistrement')
    }
  }

  async function handleCallbackConfirm(callbackDate: string) {
    setShowCallbackModal(false)
    setIsRecordingCall(true)

    const response = await recordOpportunityCallActivity(
      opportunity.id,
      'CALLBACK',
      opportunity.primaryContactId || undefined
    )

    setIsRecordingCall(false)

    if (response.success) {
      router.refresh()

      // CALLBACK: propose task creation with CALL preselected
      setTaskInitialType('CALL')
      setShowCreateTaskModal(true)
    } else {
      alert('Erreur lors de l\'enregistrement')
    }
  }

  async function handleStageChange(newStage: Stage) {
    setShowStageMenu(false)
    setIsChangingStage(true)

    const response = await updateOpportunityStage(opportunity.id, newStage)
    setIsChangingStage(false)

    if (response.success) {
      router.refresh()
    } else {
      alert('Erreur lors du changement de stage')
    }
  }

  async function handleCreateTask(taskData: {
    type: import('@/types/domain').TaskType
    dueAt: string
    priority: import('@/types/domain').Priority
    notes?: string
  }) {
    setShowCreateTaskModal(false)
    setTaskInitialType(undefined) // Reset preselection
    setIsCreatingTask(true)

    const response = await createManualTask({
      opportunityId: opportunity.id,
      contactId: opportunity.primaryContactId || undefined,
      ...taskData,
    })

    setIsCreatingTask(false)

    if (response.success) {
      router.refresh()
    } else {
      alert('Erreur lors de la création de la tâche')
    }
  }

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
          {/* Opportunity Name + Company */}
          <div>
            <h4 className="font-medium text-sm line-clamp-2 cursor-pointer">
              {opportunity.name}
            </h4>
            {company && (
              <p className="text-xs text-text-muted mt-1">{company.name}</p>
            )}
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

          {/* Contact Info (name, job title, phone, email, website) */}
          <ContactInfo contact={contact} company={company} compact />

          {/* Value */}
          {opportunity.potentialValue && (
            <div className="text-accent font-semibold text-sm">
              {opportunity.potentialValue.toLocaleString('fr-FR')} €
            </div>
          )}

          {/* Call Count + Tasks Summary */}
          <div className="flex items-center gap-3">
            <CallCounter activities={activities} compact />
            <TaskSummary tasks={tasks} compact />
          </div>

          {/* Owner + Days in Stage + Actions */}
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>{opportunity.owner}</span>
            <div className="flex items-center gap-2">
              {/* Call button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowCallMenu(true)
                }}
                className="text-accent hover:text-accent/80 text-base"
                title="Enregistrer un appel"
                disabled={isRecordingCall || isCreatingTask || isChangingStage}
              >
                📞
              </button>
              {/* Create task button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowCreateTaskModal(true)
                }}
                className="text-accent hover:text-accent/80 text-base"
                title="Créer une tâche"
                disabled={isCreatingTask || isRecordingCall || isChangingStage}
              >
                ✚
              </button>
              {/* Change stage button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowStageMenu(true)
                }}
                className="text-accent hover:text-accent/80 text-base"
                title="Changer le stage"
                disabled={isChangingStage || isRecordingCall || isCreatingTask}
              >
                ⚡
              </button>
              <span>{daysInStage}j</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Call Result Menu */}
      {showCallMenu && (
        <CallResultMenu
          onSelect={handleCallResult}
          onCancel={() => setShowCallMenu(false)}
        />
      )}

      {/* Callback Modal */}
      {showCallbackModal && (
        <CallbackModal
          onConfirm={handleCallbackConfirm}
          onCancel={() => setShowCallbackModal(false)}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <CreateTaskModal
          onConfirm={handleCreateTask}
          onCancel={() => {
            setShowCreateTaskModal(false)
            setTaskInitialType(undefined) // Reset preselection on cancel
          }}
          initialType={taskInitialType}
        />
      )}

      {/* Stage Change Menu */}
      {showStageMenu && (
        <StageChangeMenu
          currentStage={opportunity.stage}
          stages={allStages}
          onSelect={handleStageChange}
          onCancel={() => setShowStageMenu(false)}
        />
      )}
    </div>
  )
}
