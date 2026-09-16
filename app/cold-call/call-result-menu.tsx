'use client'

// Quick call result menu

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ActivityResult } from '@/types/domain'

interface CallResultMenuProps {
  onSelect: (result: ActivityResult) => void
  onCancel: () => void
}

const CALL_RESULTS: { value: ActivityResult; label: string }[] = [
  { value: 'NO_ANSWER', label: 'Pas de réponse' },
  { value: 'VOICEMAIL', label: 'Message vocal' },
  { value: 'CONVERSATION', label: 'Conversation' },
  { value: 'MEETING_BOOKED', label: 'RDV pris' },
  { value: 'NOT_INTERESTED', label: 'Pas intéressé' },
  { value: 'CALLBACK', label: 'Demande de rappel (après échange)' },
  { value: 'EMAIL_REQUESTED', label: 'Email demandé' },
  { value: 'WRONG_NUMBER', label: 'Mauvais numéro' },
]

export function CallResultMenu({ onSelect, onCancel }: CallResultMenuProps) {
  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
      <Card className="max-w-sm w-full p-4 space-y-3">
        <div>
          <h3 className="text-lg font-bold font-syne">Résultat de l'appel</h3>
          <p className="text-xs text-text-muted mt-1">
            Enregistrer rapidement le résultat
          </p>
        </div>

        <div className="space-y-2">
          {CALL_RESULTS.map((result) => (
            <Button
              key={result.value}
              onClick={() => onSelect(result.value)}
              variant="ghost"
              className="w-full justify-start"
            >
              {result.label}
            </Button>
          ))}
        </div>

        <Button onClick={onCancel} variant="ghost" className="w-full">
          Annuler
        </Button>
      </Card>
    </div>
  )
}
