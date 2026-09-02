'use client'

// Result selection step (Phase 5)

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { TaskType } from '@/types/domain'
import type { SelectedResult } from './focus-prospect-view'

interface ResultSelectionProps {
  taskType: TaskType
  onSelectResult: (result: SelectedResult) => void
  onSkip: () => void
}

export function ResultSelection({ taskType, onSelectResult, onSkip }: ResultSelectionProps) {
  // Get result options based on task type
  const getResultOptions = (): Array<{ value: SelectedResult; label: string }> => {
    switch (taskType) {
      case 'CALL':
      case 'FOLLOW_UP':
        return [
          { value: 'NO_ANSWER', label: 'Pas de réponse' },
          { value: 'CONVERSATION', label: 'Conversation' },
          { value: 'MEETING_BOOKED', label: 'RDV pris' },
          { value: 'CALLBACK', label: 'À rappeler' },
          { value: 'NOT_INTERESTED', label: 'Pas intéressé' },
        ]

      case 'EMAIL':
        return [
          { value: 'EMAIL_SENT', label: 'Email envoyé' },
          { value: 'POSTPONE', label: 'Pas envoyé / reporter' },
        ]

      case 'LINKEDIN':
        return [
          { value: 'LINKEDIN_DONE', label: 'Action effectuée' },
          { value: 'POSTPONE', label: 'Pas effectuée / reporter' },
        ]

      case 'MEETING':
        return [
          { value: 'MEETING_DONE', label: 'RDV réalisé' },
          { value: 'POSTPONE', label: 'RDV annulé / reporté' },
        ]

      case 'DEMO':
        return [
          { value: 'DEMO_DONE', label: 'Démo réalisée' },
          { value: 'POSTPONE', label: 'Démo annulée / reportée' },
        ]

      case 'OTHER':
      default:
        return [
          { value: 'TASK_DONE', label: 'Effectué' },
          { value: 'POSTPONE', label: 'Reporter' },
        ]
    }
  }

  const resultOptions = getResultOptions()

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">QUEL EST LE RÉSULTAT ?</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {resultOptions.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              size="lg"
              onClick={() => onSelectResult(option.value)}
              className="justify-start text-left h-auto py-4"
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="pt-4 border-t border-border">
          <button
            onClick={onSkip}
            className="text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Passer pour l'instant
          </button>
        </div>
      </div>
    </Card>
  )
}
