'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddToProspectingModal } from '@/components/prospecting/add-to-prospecting-modal'
import { CallResultMenu } from '@/app/cold-call/call-result-menu'
import { MultichannelActionMenu } from '@/app/cold-call/multichannel-action-menu'
import { StatusChangeMenu } from '@/app/cold-call/status-change-menu'
import { CreateTaskModal } from '@/components/pipeline/create-task-modal'
import { CreateActivityModal } from '@/components/pipeline/create-activity-modal'
import {
  recordCallActivity,
  recordEmailActivity,
  recordLinkedInActivity,
  updateColdCallStatus,
} from '@/app/cold-call/actions'
import { createManualTask } from '@/lib/actions/task-actions'
import type {
  Activity,
  ActivityResult,
  BusinessLine,
  ColdCallTarget,
  Company,
  Contact,
  Owner,
  Priority,
  Task,
  TaskType,
} from '@/types/domain'

interface CompanyContactSalesActionsProps {
  company: Company
  contact: Contact
  target: ColdCallTarget | null
  businessLines: BusinessLine[]
  currentOwner: Owner
  activities: Activity[]
  tasks: Task[]
}

export function CompanyContactSalesActions({
  company,
  contact,
  target,
  businessLines,
  currentOwner,
  activities,
  tasks,
}: CompanyContactSalesActionsProps) {
  const router = useRouter()
  const [showProspectingModal, setShowProspectingModal] = useState(false)
  const [showCallMenu, setShowCallMenu] = useState(false)
  const [showMultichannelMenu, setShowMultichannelMenu] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [taskInitialType, setTaskInitialType] = useState<TaskType | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)

  const lastCallWithNotes = useMemo(
    () =>
      [...activities]
        .filter((activity) => activity.type === 'CALL' && activity.notes)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null,
    [activities]
  )

  const openTasks = useMemo(
    () => tasks.filter((task) => task.status === 'TODO'),
    [tasks]
  )

  async function handleCallResult(result: ActivityResult, notes?: string) {
    if (!target) return
    setShowCallMenu(false)
    setIsSaving(true)
    const response = await recordCallActivity(target.id, result, { notes })
    setIsSaving(false)

    if (!response.success) {
      alert(response.error || "Erreur lors de l'enregistrement de l'appel")
      return
    }

    if (result === 'EMAIL_REQUESTED') {
      setTaskInitialType('EMAIL')
      setShowTaskModal(true)
    }

    router.refresh()
  }

  async function handleEmailAction(result: 'EMAIL_SENT' | 'EMAIL_REPLY') {
    if (!target) return
    setShowMultichannelMenu(false)
    setIsSaving(true)
    const response = await recordEmailActivity(target.id, result)
    setIsSaving(false)

    if (!response.success) {
      alert(response.error || "Erreur lors de l'enregistrement de l'email")
      return
    }

    router.refresh()
  }

  async function handleLinkedInAction(result: 'LINKEDIN_SENT' | 'LINKEDIN_REPLY') {
    if (!target) return
    setShowMultichannelMenu(false)
    setIsSaving(true)
    const response = await recordLinkedInActivity(target.id, result)
    setIsSaving(false)

    if (!response.success) {
      alert(response.error || "Erreur lors de l'enregistrement LinkedIn")
      return
    }

    router.refresh()
  }

  async function handleStatusChange(newStatus: ColdCallTarget['callStatus']) {
    if (!target) return
    setShowStatusMenu(false)
    setIsSaving(true)
    const response = await updateColdCallStatus(target.id, newStatus)
    setIsSaving(false)

    if (!response.success) {
      alert(response.error || 'Erreur lors du changement de statut')
      return
    }

    router.refresh()
  }

  async function handleCreateTask(data: {
    type: TaskType
    dueAt: string
    priority: Priority
    notes?: string
  }) {
    setIsSaving(true)

    const response = await createManualTask({
      coldCallTargetId: target?.id,
      opportunityId: target?.opportunityId || undefined,
      contactId: contact.id,
      ...data,
    })

    setIsSaving(false)

    if (!response.success) {
      alert(response.error || 'Erreur lors de la création de la tâche')
      return
    }

    setShowTaskModal(false)
    setTaskInitialType(undefined)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setShowActivityModal(true)} disabled={isSaving}>+ Activité réalisée</Button>
        <Button size="sm" variant="ghost" onClick={() => { setTaskInitialType('MEETING'); setShowTaskModal(true) }} disabled={isSaving}>Planifier un rendez-vous</Button>
        <Button size="sm" variant="ghost" onClick={() => setShowTaskModal(true)} disabled={isSaving}>+ Tâche</Button>
      </div>
      {target ? (
        <>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant="muted">{target.callStatus}</Badge>
            {openTasks.length > 0 && (
              <span className="text-xs text-text-muted">📋 {openTasks.length}</span>
            )}
            <button
              type="button"
              onClick={() => setShowCallMenu(true)}
              className="text-accent hover:text-accent/80 text-base"
              title="Enregistrer un appel"
              disabled={isSaving}
            >
              📞
            </button>
            <button
              type="button"
              onClick={() => setShowMultichannelMenu(true)}
              className="text-accent hover:text-accent/80 text-base"
              title="Email / LinkedIn"
              disabled={isSaving}
            >
              ✉️
            </button>
            <button
              type="button"
              onClick={() => setShowTaskModal(true)}
              className="text-accent hover:text-accent/80 text-base"
              title="Créer une tâche"
              disabled={isSaving}
            >
              ✚
            </button>
            <button
              type="button"
              onClick={() => setShowStatusMenu(true)}
              className="text-accent hover:text-accent/80 text-base"
              title="Changer le statut de prospection"
              disabled={isSaving}
            >
              ⚡
            </button>
          </div>

          {lastCallWithNotes && (
            <div className="text-xs text-text-muted text-right max-w-md ml-auto">
              <span className="font-medium text-text-primary">Dernier appel : </span>
              <span>{lastCallWithNotes.notes}</span>
            </div>
          )}
        </>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowProspectingModal(true)}
        >
          Prospecter
        </Button>
      )}

      {showProspectingModal && (
        <AddToProspectingModal
          companyId={company.id}
          companyName={company.name}
          contacts={[contact]}
          businessLines={businessLines}
          preSelectedContactId={contact.id}
          currentOwner={currentOwner}
          onClose={() => setShowProspectingModal(false)}
        />
      )}

      {showActivityModal && (
        <CreateActivityModal
          contactId={contact.id}
          coldCallTargetId={target?.id}
          opportunityId={target?.opportunityId || undefined}
          revalidatePaths={[`/companies/${company.id}`, `/contacts/${contact.id}`]}
          onClose={() => setShowActivityModal(false)}
        />
      )}

      {showCallMenu && target && (
        <CallResultMenu
          onSelect={handleCallResult}
          onCancel={() => setShowCallMenu(false)}
        />
      )}

      {showMultichannelMenu && target && (
        <MultichannelActionMenu
          onEmailSent={() => handleEmailAction('EMAIL_SENT')}
          onEmailReply={() => handleEmailAction('EMAIL_REPLY')}
          onLinkedInSent={() => handleLinkedInAction('LINKEDIN_SENT')}
          onLinkedInReply={() => handleLinkedInAction('LINKEDIN_REPLY')}
          onCancel={() => setShowMultichannelMenu(false)}
        />
      )}

      {showTaskModal && (
        <CreateTaskModal
          onConfirm={handleCreateTask}
          onCancel={() => {
            setShowTaskModal(false)
            setTaskInitialType(undefined)
          }}
          initialType={taskInitialType}
          pending={isSaving}
        />
      )}

      {showStatusMenu && target && (
        <StatusChangeMenu
          currentStatus={target.callStatus}
          onSelect={handleStatusChange}
          onCancel={() => setShowStatusMenu(false)}
        />
      )}
    </div>
  )
}
