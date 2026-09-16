'use client'

// Modal for manually creating a task

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createISOFromParisDateTime } from '@/lib/utils/timezone'
import type { TaskType, Priority } from '@/types/domain'

interface CreateTaskModalProps {
  onConfirm: (data: {
    type: TaskType
    dueAt: string
    priority: Priority
    notes?: string
  }) => void
  onCancel: () => void
  initialType?: TaskType
}

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: 'CALL', label: 'Appel' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'MEETING', label: 'Réunion' },
  { value: 'DEMO', label: 'Démo' },
  { value: 'PROPOSAL', label: 'Préparer proposition' },
  { value: 'DOCUMENT', label: 'Envoyer document' },
  { value: 'FOLLOW_UP', label: 'Relance' },
  { value: 'OTHER', label: 'Autre' },
]

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'Haute' },
  { value: 'MEDIUM', label: 'Moyenne' },
  { value: 'LOW', label: 'Basse' },
]

export function CreateTaskModal({ onConfirm, onCancel, initialType }: CreateTaskModalProps) {
  const [type, setType] = useState<TaskType>(initialType || 'CALL')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [priority, setPriority] = useState<Priority>('MEDIUM')
  const [notes, setNotes] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!dueDate) {
      alert('Date obligatoire')
      return
    }

    // Convert local Paris date/time to ISO string
    // If no time specified, defaults to 23:59 Paris time (end of day)
    const dueAt = createISOFromParisDateTime(dueDate, dueTime || undefined)

    onConfirm({
      type,
      dueAt,
      priority,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div>
          <h3 className="text-lg font-bold font-syne">Créer une tâche</h3>
          <p className="text-xs text-text-muted mt-1">
            Planifier une prochaine action
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Type */}
          <div>
            <label className="text-sm font-medium text-text-primary">
              Type de tâche
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TaskType)}
              className="w-full mt-1 px-3 py-2 bg-card-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {TASK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-sm font-medium text-text-primary">
              Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-card-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>

          {/* Due Time */}
          <div>
            <label className="text-sm font-medium text-text-primary">
              Heure (optionnel)
            </label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-card-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Laisser vide pour toute la journée"
            />
            <p className="text-xs text-text-muted mt-1">
              Si vide, échéance fixée en fin de journée
            </p>
          </div>

          {/* Priority */}
          <div>
            <label className="text-sm font-medium text-text-primary">
              Priorité
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full mt-1 px-3 py-2 bg-card-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-text-primary">
              Notes (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-card-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              rows={3}
              placeholder="Informations complémentaires..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" className="flex-1">
              Créer
            </Button>
            <Button type="button" onClick={onCancel} variant="ghost" className="flex-1">
              Annuler
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
