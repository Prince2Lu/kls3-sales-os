'use client'

// Prospecting Kanban Column
// Multi-channel: cold call, email, LinkedIn, referrals, etc.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ColdCallTarget, Company, Contact, BusinessLine, ActivityResult, Owner, Activity, Task } from '@/types/domain'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CallResultMenu } from './call-result-menu'
import { CallbackModal } from './callback-modal'
import { StatusChangeMenu } from './status-change-menu'
import { ColdCallQuickView } from './cold-call-quick-view'
import { TargetOptionsMenu } from './target-options-menu'
import { RemoveFromProspectingModal } from './remove-from-prospecting-modal'
import { recordCallActivity, recordEmailActivity, updateColdCallStatus } from './actions'
import { ContactInfo } from '@/components/pipeline/contact-info'
import { CallCounter } from '@/components/pipeline/call-counter'
import { TaskSummary } from '@/components/pipeline/task-summary'
import { CreateTaskModal } from '@/components/pipeline/create-task-modal'
import { createManualTask } from '@/lib/actions/task-actions'

interface ColdCallColumnProps {
  id: string
  title: string
  targets: ColdCallTarget[]
  companiesMap: Record<string, Company>
  contactsMap: Record<string, Contact>
  blMap: Record<string, BusinessLine>
  activitiesByTargetId: Record<string, Activity[]>
  tasksByTargetId: Record<string, Task[]>
  isStageColumn?: boolean
  currentOwner: Owner
}

export function ColdCallColumn({
  id,
  title,
  targets,
  companiesMap,
  contactsMap,
  blMap,
  activitiesByTargetId,
  tasksByTargetId,
  isStageColumn = false,
  currentOwner,
}: ColdCallColumnProps) {
  const { setNodeRef } = useDroppable({ id })
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)

  // Derive selected target data
  const selectedTarget = selectedTargetId
    ? targets.find((t) => t.id === selectedTargetId)
    : null

  const selectedCompany = selectedTarget?.companyId
    ? companiesMap[selectedTarget.companyId]
    : null

  const selectedContact =
    selectedTarget?.contactId
      ? contactsMap[selectedTarget.contactId]
      : null

  const selectedBusinessLine = selectedTarget?.businessLineId
    ? blMap[selectedTarget.businessLineId]
    : null

  const selectedActivities = selectedTarget
    ? activitiesByTargetId[selectedTarget.id] || []
    : []

  const selectedTasks = selectedTarget
    ? tasksByTargetId[selectedTarget.id] || []
    : []

  // Get last activity (most recent)
  const lastActivity =
    selectedActivities.length > 0
      ? selectedActivities.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0]
      : null

  // Get next task (earliest due date with status TODO)
  const nextTask =
    selectedTasks
      .filter((t) => t.status === 'TODO')
      .sort((a, b) => {
        if (!a.dueAt) return 1
        if (!b.dueAt) return -1
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      })[0] || null

  return (
    <div className="flex-shrink-0 w-80">
      <div className="space-y-3">
        {/* Column Header */}
        <div className="flex items-center justify-between px-3">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="text-xs text-text-muted bg-card-bg px-2 py-1 rounded-full">
            {targets.length}
          </span>
        </div>

        {/* Droppable Area */}
        <SortableContext
          id={id}
          items={targets.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={setNodeRef}
            className="space-y-2 min-h-[200px] bg-card-bg rounded-lg p-2 border border-border"
          >
            {targets.length === 0 && (
              <div className="text-center text-text-muted text-xs py-8">Vide</div>
            )}
            {targets.map((target) => (
              <TargetCard
                key={target.id}
                target={target}
                company={companiesMap[target.companyId]}
                contact={target.contactId ? contactsMap[target.contactId] : null}
                businessLine={blMap[target.businessLineId]}
                activities={activitiesByTargetId[target.id] || []}
                tasks={tasksByTargetId[target.id] || []}
                currentOwner={currentOwner}
                onOpenQuickView={() => setSelectedTargetId(target.id)}
              />
            ))}
          </div>
        </SortableContext>
      </div>

      {/* Quick View Drawer */}
      {selectedTarget && (
        <ColdCallQuickView
          target={selectedTarget}
          company={selectedCompany}
          contact={selectedContact}
          businessLine={selectedBusinessLine}
          lastActivity={lastActivity}
          nextTask={nextTask}
          open={!!selectedTargetId}
          onClose={() => setSelectedTargetId(null)}
        />
      )}
    </div>
  )
}

interface TargetCardProps {
  target: ColdCallTarget
  company?: Company
  contact?: Contact | null
  businessLine?: BusinessLine
  activities: Activity[]
  tasks: Task[]
  currentOwner: Owner
  onOpenQuickView: () => void
}

function TargetCard({ target, company, contact, businessLine, activities, tasks, currentOwner, onOpenQuickView }: TargetCardProps) {
  const router = useRouter()
  const [showCallMenu, setShowCallMenu] = useState(false)
  const [showCallbackModal, setShowCallbackModal] = useState(false)
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [taskInitialType, setTaskInitialType] = useState<import('@/types/domain').TaskType | undefined>(undefined)
  const [isRecording, setIsRecording] = useState(false)
  const [isChangingStatus, setIsChangingStatus] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: target.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  async function handleCallResult(result: ActivityResult) {
    setShowCallMenu(false)

    // CALLBACK requires date
    if (result === 'CALLBACK') {
      setShowCallbackModal(true)
      return
    }

    // Other results: record directly
    // owner is determined server-side from session
    setIsRecording(true)
    const response = await recordCallActivity(target.id, result)
    setIsRecording(false)

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
    setIsRecording(true)

    // owner is determined server-side from session
    const response = await recordCallActivity(target.id, 'CALLBACK', {
      callbackDate,
    })

    setIsRecording(false)

    if (response.success) {
      router.refresh()

      // CALLBACK: propose task creation with CALL preselected
      setTaskInitialType('CALL')
      setShowCreateTaskModal(true)
    } else {
      alert('Erreur lors de l\'enregistrement')
    }
  }

  async function handleStatusChange(newStatus: import('@/types/domain').CallStatus) {
    setShowStatusMenu(false)

    // À rappeler requires callback date
    if (newStatus === 'À rappeler') {
      setShowCallbackModal(true)
      return
    }

    setIsChangingStatus(true)
    const response = await updateColdCallStatus(target.id, newStatus)
    setIsChangingStatus(false)

    if (response.success) {
      router.refresh()
    } else {
      alert('Erreur lors du changement de statut')
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
    setIsRecording(true)

    const response = await createManualTask({
      coldCallTargetId: target.id,
      opportunityId: target.opportunityId || undefined,
      contactId: target.contactId || undefined,
      ...taskData,
    })

    setIsRecording(false)

    if (response.success) {
      router.refresh()
    } else {
      alert('Erreur lors de la création de la tâche')
    }
  }

  async function handleEmailReply() {
    setIsRecording(true)
    const response = await recordEmailActivity(target.id)
    setIsRecording(false)

    if (response.success) {
      router.refresh()
    } else {
      alert('Erreur lors de l\'enregistrement de la réponse email')
    }
  }

  async function handleRemoveFromProspecting() {
    setShowOptionsMenu(false)
    setShowRemoveModal(true)
  }

  async function handleRemoveConfirm() {
    setShowRemoveModal(false)
    setIsRecording(true)

    const { removeFromProspecting } = await import('@/lib/actions/prospecting-actions')
    const response = await removeFromProspecting(target.id)

    setIsRecording(false)

    if (response.success) {
      router.refresh()
    } else {
      alert(response.message || 'Erreur lors du retrait de la prospection')
    }
  }

  // Count open tasks
  const openTasksCount = tasks.filter(t => t.status === 'TODO').length

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card className="space-y-3">
        {/* Company Name - Clickable to open Quick View */}
        <div>
          <h4
            className="font-medium text-sm line-clamp-1 cursor-pointer hover:text-accent transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onOpenQuickView()
            }}
          >
            {company?.name || 'Entreprise inconnue'}
          </h4>
        </div>

        {/* Contact Info (name, job title, phone, email, website) */}
        <ContactInfo contact={contact} company={company} />

        {/* Call Count + Tasks Summary */}
        <div className="flex items-center gap-3">
          <CallCounter activities={activities} compact />
          <TaskSummary tasks={tasks} compact />
        </div>

        {/* Business Line Badge */}
        {businessLine && (
          <div>
            <Badge variant="accent" className="text-xs">
              {businessLine.code === 'SACHA' ? 'Leverio' : businessLine.name}
            </Badge>
          </div>
        )}

        {/* Owner + Actions */}
        <div className="text-xs text-text-muted flex items-center justify-between gap-2">
          <span>{target.owner}</span>
          <div className="flex items-center gap-2">
            {/* Call button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowCallMenu(true)
              }}
              className="text-accent hover:text-accent/80 text-base"
              title="Enregistrer un appel"
              disabled={isRecording || isChangingStatus}
            >
              📞
            </button>
            {/* Email reply button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleEmailReply()
              }}
              className="text-accent hover:text-accent/80 text-base"
              title="Réponse email reçue"
              disabled={isRecording || isChangingStatus}
            >
              📧
            </button>
            {/* Create task button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowCreateTaskModal(true)
              }}
              className="text-accent hover:text-accent/80 text-base"
              title="Créer une tâche"
              disabled={isRecording || isChangingStatus}
            >
              ✚
            </button>
            {/* Change status button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowStatusMenu(true)
              }}
              className="text-accent hover:text-accent/80 text-base"
              title="Changer le statut"
              disabled={isRecording || isChangingStatus}
            >
              ⚡
            </button>
            {/* Options menu button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowOptionsMenu(true)
              }}
              className="text-text-muted hover:text-text-primary text-base"
              title="Options"
              disabled={isRecording || isChangingStatus}
            >
              ⋮
            </button>
            {target.opportunityId && (
              <Link
                href={`/prospects/${target.opportunityId}`}
                className="text-accent hover:underline text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                →
              </Link>
            )}
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

      {/* Status Change Menu */}
      {showStatusMenu && (
        <StatusChangeMenu
          currentStatus={target.callStatus}
          onSelect={handleStatusChange}
          onCancel={() => setShowStatusMenu(false)}
        />
      )}

      {/* Options Menu */}
      {showOptionsMenu && (
        <TargetOptionsMenu
          onRemoveFromProspecting={handleRemoveFromProspecting}
          onCancel={() => setShowOptionsMenu(false)}
        />
      )}

      {/* Remove from Prospecting Modal */}
      {showRemoveModal && (
        <RemoveFromProspectingModal
          company={company || null}
          contact={contact || null}
          businessLine={businessLine || null}
          callStatus={target.callStatus}
          openTasksCount={openTasksCount}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setShowRemoveModal(false)}
        />
      )}
    </div>
  )
}
