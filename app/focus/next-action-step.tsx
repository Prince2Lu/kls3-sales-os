'use client'

// Next Action Step (Phase 5)
// Handles the next action workflow after result selection

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Task, Opportunity } from '@/types/domain'
import type { SelectedResult } from './focus-prospect-view'
import {
  processNoAnswer,
  processConversation,
  processMeetingBooked,
  processCallback,
  processNotInterested,
  processEmailSent,
  processLinkedInDone,
  processMeetingDone,
  processDemoDone,
  processTaskDone,
  processPostpone,
} from './actions'

interface NextActionStepProps {
  task: Task
  opportunity: Opportunity | null
  result: SelectedResult
  onComplete: () => void
  onCancel: () => void
}

type NextActionType = 'CALL' | 'EMAIL' | 'LINKEDIN' | 'MEETING' | 'FOLLOW_UP'

export function NextActionStep({
  task,
  opportunity,
  result,
  onComplete,
  onCancel,
}: NextActionStepProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Next action form state
  const [nextActionType, setNextActionType] = useState<NextActionType | null>(null)
  const [nextActionDate, setNextActionDate] = useState('')
  const [nextActionTime, setNextActionTime] = useState('')
  const [nextActionNote, setNextActionNote] = useState('')

  // Decision for NOT_INTERESTED
  const [lostDecision, setLostDecision] = useState<'CLOSE' | 'KEEP' | null>(null)

  // Handle submission
  const handleSubmit = async () => {
    setError(null)

    startTransition(async () => {
      try {
        switch (result) {
          case 'NO_ANSWER':
            if (!nextActionDate || !nextActionTime) {
              setError('Date et heure requises')
              return
            }
            await processNoAnswer({
              taskId: task.id,
              opportunityId: task.opportunityId,
              contactId: task.contactId,
              owner: task.owner,
              nextActionDate,
              nextActionTime,
              notes: nextActionNote,
            })
            break

          case 'CONVERSATION':
            if (!nextActionType) {
              setError('Sélectionnez une prochaine action')
              return
            }
            if (!nextActionDate || !nextActionTime) {
              setError('Date et heure requises')
              return
            }
            await processConversation({
              taskId: task.id,
              opportunityId: task.opportunityId,
              contactId: task.contactId,
              owner: task.owner,
              currentStage: opportunity?.stage,
              nextActionType,
              nextActionDate,
              nextActionTime,
              notes: nextActionNote,
            })
            break

          case 'MEETING_BOOKED':
            if (!nextActionDate || !nextActionTime) {
              setError('Date et heure du RDV requises')
              return
            }
            await processMeetingBooked({
              taskId: task.id,
              opportunityId: task.opportunityId,
              contactId: task.contactId,
              owner: task.owner,
              currentStage: opportunity?.stage,
              meetingDate: nextActionDate,
              meetingTime: nextActionTime,
              notes: nextActionNote,
            })
            break

          case 'CALLBACK':
            if (!nextActionDate || !nextActionTime) {
              setError('Date et heure de rappel requises')
              return
            }
            await processCallback({
              taskId: task.id,
              opportunityId: task.opportunityId,
              contactId: task.contactId,
              owner: task.owner,
              callbackDate: nextActionDate,
              callbackTime: nextActionTime,
              notes: nextActionNote,
            })
            break

          case 'NOT_INTERESTED':
            if (!lostDecision) {
              setError('Choisissez une option')
              return
            }
            if (lostDecision === 'KEEP') {
              if (!nextActionType || !nextActionDate || !nextActionTime) {
                setError('Prochaine action requise')
                return
              }
            }
            await processNotInterested({
              taskId: task.id,
              opportunityId: task.opportunityId,
              contactId: task.contactId,
              owner: task.owner,
              closeLost: lostDecision === 'CLOSE',
              nextActionType: lostDecision === 'KEEP' ? nextActionType || undefined : undefined,
              nextActionDate: lostDecision === 'KEEP' ? nextActionDate : undefined,
              nextActionTime: lostDecision === 'KEEP' ? nextActionTime : undefined,
              notes: nextActionNote,
            })
            break

          case 'EMAIL_SENT':
            await processEmailSent({
              taskId: task.id,
              opportunityId: task.opportunityId,
              contactId: task.contactId,
              owner: task.owner,
              notes: nextActionNote,
            })
            break

          case 'LINKEDIN_DONE':
            await processLinkedInDone({
              taskId: task.id,
              opportunityId: task.opportunityId,
              contactId: task.contactId,
              owner: task.owner,
              notes: nextActionNote,
            })
            break

          case 'MEETING_DONE':
            if (!nextActionType || !nextActionDate || !nextActionTime) {
              setError('Prochaine action requise')
              return
            }
            await processMeetingDone({
              taskId: task.id,
              opportunityId: task.opportunityId,
              contactId: task.contactId,
              owner: task.owner,
              nextActionType,
              nextActionDate,
              nextActionTime,
              notes: nextActionNote,
            })
            break

          case 'DEMO_DONE':
            if (!nextActionType || !nextActionDate || !nextActionTime) {
              setError('Prochaine action requise')
              return
            }
            await processDemoDone({
              taskId: task.id,
              opportunityId: task.opportunityId,
              contactId: task.contactId,
              owner: task.owner,
              nextActionType,
              nextActionDate,
              nextActionTime,
              notes: nextActionNote,
            })
            break

          case 'TASK_DONE':
            await processTaskDone({
              taskId: task.id,
              opportunityId: task.opportunityId,
              contactId: task.contactId,
              owner: task.owner,
              notes: nextActionNote,
            })
            break

          case 'POSTPONE':
            if (!nextActionDate || !nextActionTime) {
              setError('Nouvelle date requise')
              return
            }
            await processPostpone({
              taskId: task.id,
              newDate: nextActionDate,
              newTime: nextActionTime,
            })
            break
        }

        onComplete()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      }
    })
  }

  // Get quick date options
  const getQuickDateOptions = () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const in2Days = new Date(today)
    in2Days.setDate(in2Days.getDate() + 2)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    return [
      { label: 'Demain', value: tomorrow.toISOString().split('T')[0] },
      { label: 'Dans 2 jours', value: in2Days.toISOString().split('T')[0] },
      { label: 'Semaine prochaine', value: nextWeek.toISOString().split('T')[0] },
    ]
  }

  const quickDateOptions = getQuickDateOptions()

  // Render different UI based on result type
  const renderContent = () => {
    // NO_ANSWER - requires next callback
    if (result === 'NO_ANSWER') {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Quand rappeler ?</h3>

          <div className="flex gap-2 flex-wrap">
            {quickDateOptions.map((option) => (
              <Button
                key={option.value}
                variant="ghost"
                size="sm"
                onClick={() => setNextActionDate(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-text-muted mb-1 block">Date</label>
              <Input
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm text-text-muted mb-1 block">Heure</label>
              <Input
                type="time"
                value={nextActionTime}
                onChange={(e) => setNextActionTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-text-muted mb-1 block">Note (optionnel)</label>
            <Input
              placeholder="Note..."
              value={nextActionNote}
              onChange={(e) => setNextActionNote(e.target.value)}
            />
          </div>
        </div>
      )
    }

    // CONVERSATION - requires next action type + date
    if (result === 'CONVERSATION') {
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-muted mb-2 block">
              Que faut-il retenir ? (optionnel)
            </label>
            <Input
              placeholder="Note..."
              value={nextActionNote}
              onChange={(e) => setNextActionNote(e.target.value)}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Prochaine action ?</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {(['CALL', 'EMAIL', 'LINKEDIN', 'MEETING', 'FOLLOW_UP'] as const).map(
                (type) => (
                  <Button
                    key={type}
                    variant={nextActionType === type ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setNextActionType(type)}
                  >
                    {type === 'CALL'
                      ? 'Appel'
                      : type === 'EMAIL'
                      ? 'Email'
                      : type === 'LINKEDIN'
                      ? 'LinkedIn'
                      : type === 'MEETING'
                      ? 'RDV'
                      : 'Relance'}
                  </Button>
                )
              )}
            </div>
          </div>

          {nextActionType && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-text-muted mb-1 block">Date</label>
                <Input
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm text-text-muted mb-1 block">Heure</label>
                <Input
                  type="time"
                  value={nextActionTime}
                  onChange={(e) => setNextActionTime(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
        </div>
      )
    }

    // MEETING_BOOKED - requires meeting date/time
    if (result === 'MEETING_BOOKED') {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Date et heure du RDV ?</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-text-muted mb-1 block">Date</label>
              <Input
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm text-text-muted mb-1 block">Heure</label>
              <Input
                type="time"
                value={nextActionTime}
                onChange={(e) => setNextActionTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-text-muted mb-1 block">Note (optionnel)</label>
            <Input
              placeholder="Détails du RDV..."
              value={nextActionNote}
              onChange={(e) => setNextActionNote(e.target.value)}
            />
          </div>
        </div>
      )
    }

    // CALLBACK - requires callback date/time
    if (result === 'CALLBACK') {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Quand rappeler ?</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-text-muted mb-1 block">Date</label>
              <Input
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm text-text-muted mb-1 block">Heure</label>
              <Input
                type="time"
                value={nextActionTime}
                onChange={(e) => setNextActionTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-text-muted mb-1 block">Note (optionnel)</label>
            <Input
              placeholder="Contexte du rappel..."
              value={nextActionNote}
              onChange={(e) => setNextActionNote(e.target.value)}
            />
          </div>
        </div>
      )
    }

    // NOT_INTERESTED - requires decision
    if (result === 'NOT_INTERESTED') {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Que faire de cette opportunité ?</h3>

          <div className="grid grid-cols-1 gap-3">
            <Button
              variant={lostDecision === 'CLOSE' ? 'primary' : 'ghost'}
              size="lg"
              onClick={() => setLostDecision('CLOSE')}
              className="justify-start"
            >
              A. Clôturer comme perdue
            </Button>
            <Button
              variant={lostDecision === 'KEEP' ? 'primary' : 'ghost'}
              size="lg"
              onClick={() => setLostDecision('KEEP')}
              className="justify-start"
            >
              B. Garder ouverte et programmer une relance
            </Button>
          </div>

          {lostDecision === 'KEEP' && (
            <>
              <div>
                <h4 className="text-sm font-medium mb-2">Prochaine action</h4>
                <div className="grid grid-cols-2 gap-2">
                  {(['CALL', 'EMAIL', 'LINKEDIN', 'FOLLOW_UP'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={nextActionType === type ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setNextActionType(type)}
                    >
                      {type === 'CALL'
                        ? 'Appel'
                        : type === 'EMAIL'
                        ? 'Email'
                        : type === 'LINKEDIN'
                        ? 'LinkedIn'
                        : 'Relance'}
                    </Button>
                  ))}
                </div>
              </div>

              {nextActionType && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-text-muted mb-1 block">Date</label>
                    <Input
                      type="date"
                      value={nextActionDate}
                      onChange={(e) => setNextActionDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-text-muted mb-1 block">Heure</label>
                    <Input
                      type="time"
                      value={nextActionTime}
                      onChange={(e) => setNextActionTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label className="text-sm text-text-muted mb-1 block">Note (optionnel)</label>
            <Input
              placeholder="Raison / contexte..."
              value={nextActionNote}
              onChange={(e) => setNextActionNote(e.target.value)}
            />
          </div>
        </div>
      )
    }

    // EMAIL_SENT, LINKEDIN_DONE - simple note
    if (result === 'EMAIL_SENT' || result === 'LINKEDIN_DONE') {
      return (
        <div className="space-y-4">
          <p className="text-text-muted">Action enregistrée.</p>

          <div>
            <label className="text-sm text-text-muted mb-1 block">Note (optionnel)</label>
            <Input
              placeholder="Détails..."
              value={nextActionNote}
              onChange={(e) => setNextActionNote(e.target.value)}
            />
          </div>
        </div>
      )
    }

    // MEETING_DONE, DEMO_DONE - requires next action
    if (result === 'MEETING_DONE' || result === 'DEMO_DONE') {
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-muted mb-2 block">
              Que retenir de ce{' '}
              {result === 'MEETING_DONE' ? 'rendez-vous' : 'cette démo'} ? (optionnel)
            </label>
            <Input
              placeholder="Note..."
              value={nextActionNote}
              onChange={(e) => setNextActionNote(e.target.value)}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Prochaine action</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {(['CALL', 'EMAIL', 'LINKEDIN', 'MEETING', 'FOLLOW_UP'] as const).map(
                (type) => (
                  <Button
                    key={type}
                    variant={nextActionType === type ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setNextActionType(type)}
                  >
                    {type === 'CALL'
                      ? 'Appel'
                      : type === 'EMAIL'
                      ? 'Email'
                      : type === 'LINKEDIN'
                      ? 'LinkedIn'
                      : type === 'MEETING'
                      ? 'RDV'
                      : 'Relance'}
                  </Button>
                )
              )}
            </div>
          </div>

          {nextActionType && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-text-muted mb-1 block">Date</label>
                <Input
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm text-text-muted mb-1 block">Heure</label>
                <Input
                  type="time"
                  value={nextActionTime}
                  onChange={(e) => setNextActionTime(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
        </div>
      )
    }

    // TASK_DONE - simple completion
    if (result === 'TASK_DONE') {
      return (
        <div className="space-y-4">
          <p className="text-text-muted">Tâche terminée.</p>

          <div>
            <label className="text-sm text-text-muted mb-1 block">Note (optionnel)</label>
            <Input
              placeholder="Détails..."
              value={nextActionNote}
              onChange={(e) => setNextActionNote(e.target.value)}
            />
          </div>
        </div>
      )
    }

    // POSTPONE - requires new date
    if (result === 'POSTPONE') {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Reporter à quand ?</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-text-muted mb-1 block">Date</label>
              <Input
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm text-text-muted mb-1 block">Heure</label>
              <Input
                type="time"
                value={nextActionTime}
                onChange={(e) => setNextActionTime(e.target.value)}
                required
              />
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {renderContent()}

        {error && (
          <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded">{error}</div>
        )}

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            size="lg"
            className="flex-1"
          >
            {isPending ? 'En cours...' : 'VALIDER ET PASSER AU SUIVANT'}
          </Button>
          <Button onClick={onCancel} variant="ghost" size="lg" disabled={isPending}>
            Annuler
          </Button>
        </div>
      </div>
    </Card>
  )
}
