'use client'

// Focus Prospect View (Phase 5)
// Main workflow component for a single task

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { FocusQueueItem } from './queue-builder'
import { getFrenchTaskType } from '@/lib/utils/french-labels'
import { formatFrenchTime, formatFrenchDate } from '@/lib/utils/date'
import { ResultSelection } from './result-selection'
import { NextActionStep } from './next-action-step'

interface FocusProspectViewProps {
  item: FocusQueueItem
  onComplete: (result: {
    hadConversation?: boolean
    bookedMeeting?: boolean
    noAnswer?: boolean
  }) => void
  onSkip: () => void
}

type WorkflowStep = 'prospect' | 'result' | 'next-action'

export type SelectedResult =
  | 'NO_ANSWER'
  | 'CONVERSATION'
  | 'MEETING_BOOKED'
  | 'CALLBACK'
  | 'NOT_INTERESTED'
  | 'EMAIL_SENT'
  | 'LINKEDIN_DONE'
  | 'MEETING_DONE'
  | 'DEMO_DONE'
  | 'TASK_DONE'
  | 'POSTPONE'

export function FocusProspectView({ item, onComplete, onSkip }: FocusProspectViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<WorkflowStep>('prospect')
  const [selectedResult, setSelectedResult] = useState<SelectedResult | null>(null)

  const { task, opportunity, contact, company, businessLine, lastActivity } = item

  // Handle result selection
  const handleResultSelect = (result: SelectedResult) => {
    setSelectedResult(result)
    setStep('next-action')
  }

  // Handle workflow completion
  const handleWorkflowComplete = () => {
    // Determine stats based on result
    const stats = {
      hadConversation: selectedResult === 'CONVERSATION',
      bookedMeeting: selectedResult === 'MEETING_BOOKED',
      noAnswer: selectedResult === 'NO_ANSWER',
    }

    onComplete(stats)
    router.refresh()
  }

  // Contact display name
  const contactName = contact
    ? `${contact.firstName} ${contact.lastName}`
    : 'Contact inconnu'

  // Format task action
  const getTaskActionText = () => {
    const typeText = getFrenchTaskType(task.type).toUpperCase()

    if (contact) {
      return `${typeText} ${contact.firstName.toUpperCase()} ${contact.lastName.toUpperCase()}`
    }

    return typeText
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Main prospect context - always visible */}
      <Card className="p-6">
        <div className="space-y-6">
          {/* Business Line */}
          {businessLine && (
            <div>
              <Badge variant="default">{businessLine.name}</Badge>
            </div>
          )}

          {/* Main action */}
          <div>
            <h2 className="text-3xl font-bold font-syne">{getTaskActionText()}</h2>
          </div>

          {/* Opportunity/Company */}
          <div className="space-y-2">
            {opportunity && (
              <div>
                <Link
                  href={`/prospects/${opportunity.id}`}
                  className="text-accent hover:underline text-lg font-medium"
                  target="_blank"
                >
                  {opportunity.name}
                </Link>
              </div>
            )}
            {company && (
              <div className="text-text-muted">
                Entreprise : <span className="text-text-primary">{company.name}</span>
              </div>
            )}
          </div>

          {/* Contact details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contact?.jobTitle && (
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wide mb-1">
                  Fonction
                </div>
                <div className="text-text-primary">{contact.jobTitle}</div>
              </div>
            )}

            {contact?.phone && (
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wide mb-1">
                  Téléphone
                </div>
                <div className="text-accent font-medium text-lg">{contact.phone}</div>
              </div>
            )}

            {contact?.email && (
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wide mb-1">
                  Email
                </div>
                <div className="text-accent">{contact.email}</div>
              </div>
            )}

            {opportunity?.stage && (
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wide mb-1">
                  Étape
                </div>
                <div className="text-text-primary">{opportunity.stage}</div>
              </div>
            )}
          </div>

          {/* Task objective/notes */}
          {task.notes && (
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wide mb-1">
                Objectif
              </div>
              <div className="text-text-primary">{task.notes}</div>
            </div>
          )}

          {/* Last interaction */}
          <div className="pt-4 border-t border-border">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-2">
              Dernière interaction
            </div>
            {lastActivity ? (
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="text-text-muted">
                    {formatFrenchDate(new Date(lastActivity.date))}
                  </span>
                  {' · '}
                  <span className="text-text-primary">
                    {getFrenchTaskType(lastActivity.type as any)}
                  </span>
                  {lastActivity.result && (
                    <>
                      {' · '}
                      <span className="text-text-muted">{lastActivity.result}</span>
                    </>
                  )}
                </div>
                {lastActivity.notes && (
                  <div className="text-sm text-text-muted italic">
                    "{lastActivity.notes}"
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-text-muted italic">
                Aucune interaction précédente.
              </div>
            )}
          </div>

          {/* Link to full prospect */}
          {opportunity && (
            <div>
              <Link
                href={`/prospects/${opportunity.id}`}
                className="text-sm text-accent hover:underline"
                target="_blank"
              >
                Voir la fiche complète →
              </Link>
            </div>
          )}
        </div>
      </Card>

      {/* Workflow steps */}
      {step === 'prospect' && (
        <ResultSelection
          taskType={task.type}
          onSelectResult={handleResultSelect}
          onSkip={onSkip}
        />
      )}

      {step === 'next-action' && selectedResult && (
        <NextActionStep
          task={task}
          opportunity={opportunity}
          result={selectedResult}
          onComplete={handleWorkflowComplete}
          onCancel={() => setStep('prospect')}
        />
      )}
    </div>
  )
}
