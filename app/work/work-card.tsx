'use client'

// Work Card - reuses V2 card components and actions
// Supports both prospecting targets and opportunities

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type {
  ColdCallTarget,
  Opportunity,
  BusinessLine,
  Company,
  Contact,
  Activity,
  Task,
  Owner,
  ActivityResult,
  Stage,
  TaskType,
  Priority,
} from '@/types/domain'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ContactInfo } from '@/components/pipeline/contact-info'
import { CallCounter } from '@/components/pipeline/call-counter'
import { TaskSummary } from '@/components/pipeline/task-summary'
import { CallResultMenu } from '@/app/cold-call/call-result-menu'
import { CallbackModal } from '@/app/cold-call/callback-modal'
import { StatusChangeMenu } from '@/app/cold-call/status-change-menu'
import { StageChangeMenu } from '@/app/pipeline/stage-change-menu'
import { CreateTaskModal } from '@/components/pipeline/create-task-modal'
import { recordCallActivity, updateColdCallStatus } from '@/app/cold-call/actions'
import { recordOpportunityCallActivity } from '@/lib/actions/call-actions'
import { updateOpportunityStage } from '@/app/pipeline/actions'
import { createManualTask } from '@/lib/actions/task-actions'

type StatusType = 'PRE_RDV' | 'POST_RDV'

interface WorkCardProps {
  item: ColdCallTarget | Opportunity
  company?: Company
  contact?: Contact | null
  businessLine: BusinessLine
  activities: Activity[]
  tasks: Task[]
  statusType: StatusType
  currentOwner: Owner
}

const OPPORTUNITY_STAGES: readonly Stage[] = [
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

export function WorkCard({
  item,
  company,
  contact,
  businessLine,
  activities,
  tasks,
  statusType,
  currentOwner,
}: WorkCardProps) {
  const router = useRouter()
  const [showCallMenu, setShowCallMenu] = useState(false)
  const [showCallbackModal, setShowCallbackModal] = useState(false)
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [taskInitialType, setTaskInitialType] = useState<TaskType | undefined>(undefined)
  const [isRecording, setIsRecording] = useState(false)
  const [isChangingStatus, setIsChangingStatus] = useState(false)

  // Determine if item is ColdCallTarget or Opportunity
  const isColdCallTarget = 'callStatus' in item
  const isOpportunity = 'stage' in item

  // Get opportunity link if exists
  const opportunityId = isColdCallTarget
    ? item.opportunityId
    : isOpportunity
    ? item.id
    : null

  // Handle call result for Cold Call Target
  async function handleCallResultTarget(result: ActivityResult) {
    if (!isColdCallTarget) return

    setShowCallMenu(false)

    if (result === 'CALLBACK') {
      setShowCallbackModal(true)
      return
    }

    setIsRecording(true)
    const response = await recordCallActivity(item.id, result)
    setIsRecording(false)

    if (response.success) {
      router.refresh()

      if (result === 'EMAIL_REQUESTED') {
        setTaskInitialType('EMAIL')
        setShowCreateTaskModal(true)
      }
    } else {
      alert('Erreur lors de l\'enregistrement')
    }
  }

  // Handle call result for Opportunity
  async function handleCallResultOpportunity(result: ActivityResult) {
    if (!isOpportunity) return

    setShowCallMenu(false)

    if (result === 'CALLBACK') {
      setShowCallbackModal(true)
      return
    }

    setIsRecording(true)
    const response = await recordOpportunityCallActivity(
      item.id,
      result,
      item.primaryContactId || undefined
    )
    setIsRecording(false)

    if (response.success) {
      router.refresh()

      if (result === 'EMAIL_REQUESTED') {
        setTaskInitialType('EMAIL')
        setShowCreateTaskModal(true)
      }
    } else {
      alert('Erreur lors de l\'enregistrement')
    }
  }

  // Handle callback confirm
  async function handleCallbackConfirm(callbackDate: string) {
    setShowCallbackModal(false)
    setIsRecording(true)

    if (isColdCallTarget) {
      const response = await recordCallActivity(item.id, 'CALLBACK', {
        callbackDate,
      })
      setIsRecording(false)

      if (response.success) {
        router.refresh()
        setTaskInitialType('CALL')
        setShowCreateTaskModal(true)
      } else {
        alert('Erreur lors de l\'enregistrement')
      }
    } else if (isOpportunity) {
      const response = await recordOpportunityCallActivity(
        item.id,
        'CALLBACK',
        item.primaryContactId || undefined
      )
      setIsRecording(false)

      if (response.success) {
        router.refresh()
        setTaskInitialType('CALL')
        setShowCreateTaskModal(true)
      } else {
        alert('Erreur lors de l\'enregistrement')
      }
    }
  }

  // Handle status change (ProspectingStatus for targets, Stage for opportunities)
  async function handleStatusChange(newStatus: string) {
    setShowStatusMenu(false)

    if (isColdCallTarget) {
      // ProspectingStatus change
      if (newStatus === 'Relance prévue') {
        setShowCallbackModal(true)
        return
      }

      setIsChangingStatus(true)
      const response = await updateColdCallStatus(
        item.id,
        newStatus as import('@/types/domain').CallStatus
      )
      setIsChangingStatus(false)

      if (response.success) {
        router.refresh()
      } else {
        alert('Erreur lors du changement de statut')
      }
    } else if (isOpportunity) {
      // Stage change
      setIsChangingStatus(true)
      const response = await updateOpportunityStage(item.id, newStatus as Stage)
      setIsChangingStatus(false)

      if (response.success) {
        router.refresh()
      } else {
        alert('Erreur lors du changement de stage')
      }
    }
  }

  // Handle task creation
  async function handleCreateTask(taskData: {
    type: TaskType
    dueAt: string
    priority: Priority
    notes?: string
  }) {
    setShowCreateTaskModal(false)
    setTaskInitialType(undefined)
    setIsRecording(true)

    if (isColdCallTarget) {
      const response = await createManualTask({
        coldCallTargetId: item.id,
        opportunityId: item.opportunityId || undefined,
        contactId: item.contactId || undefined,
        ...taskData,
      })

      setIsRecording(false)

      if (response.success) {
        router.refresh()
      } else {
        alert('Erreur lors de la création de la tâche')
      }
    } else if (isOpportunity) {
      const response = await createManualTask({
        opportunityId: item.id,
        contactId: item.primaryContactId || undefined,
        ...taskData,
      })

      setIsRecording(false)

      if (response.success) {
        router.refresh()
      } else {
        alert('Erreur lors de la création de la tâche')
      }
    }
  }

  return (
    <Card className="space-y-3">
      {/* Company Name */}
      <div>
        <h4 className="font-medium text-sm line-clamp-1">
          {company?.name || 'Entreprise inconnue'}
        </h4>
        {isOpportunity && item.name && (
          <p className="text-xs text-text-muted mt-1 line-clamp-1">{item.name}</p>
        )}
      </div>

      {/* Contact Info */}
      <ContactInfo contact={contact} company={company} compact />

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
        <span>{item.owner}</span>
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
          {/* Link to opportunity if exists */}
          {opportunityId && (
            <Link
              href={`/prospects/${opportunityId}`}
              className="text-accent hover:underline text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              →
            </Link>
          )}
        </div>
      </div>

      {/* Call Result Menu */}
      {showCallMenu && (
        <CallResultMenu
          onSelect={isColdCallTarget ? handleCallResultTarget : handleCallResultOpportunity}
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
            setTaskInitialType(undefined)
          }}
          initialType={taskInitialType}
        />
      )}

      {/* Status Change Menu (ProspectingStatus for targets, Stage for opportunities) */}
      {showStatusMenu && (
        <>
          {isColdCallTarget ? (
            <StatusChangeMenu
              currentStatus={item.callStatus}
              onSelect={(status) => handleStatusChange(status)}
              onCancel={() => setShowStatusMenu(false)}
            />
          ) : isOpportunity ? (
            <StageChangeMenu
              currentStage={item.stage}
              stages={OPPORTUNITY_STAGES}
              onSelect={(stage) => handleStatusChange(stage)}
              onCancel={() => setShowStatusMenu(false)}
            />
          ) : null}
        </>
      )}
    </Card>
  )
}
