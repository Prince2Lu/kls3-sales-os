'use client'

// Modal for scheduling callback

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface CallbackModalProps {
  onConfirm: (callbackDate: string) => void
  onCancel: () => void
}

export function CallbackModal({ onConfirm, onCancel }: CallbackModalProps) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('14:00')

  function handleConfirm() {
    if (!date) {
      alert('Veuillez sélectionner une date')
      return
    }

    // Combine date and time into ISO string
    const callbackDateTime = `${date}T${time}:00.000Z`
    onConfirm(callbackDateTime)
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="max-w-md w-full p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold font-syne">Planifier un rappel</h2>
          <p className="text-text-muted text-sm mt-1">
            Choisir la date et l'heure du prochain appel
          </p>
        </div>

        <div className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-card-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium mb-2">Heure</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 bg-card-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleConfirm} className="flex-1">
            Confirmer
          </Button>
          <Button onClick={onCancel} variant="ghost" className="flex-1">
            Annuler
          </Button>
        </div>
      </Card>
    </div>
  )
}
