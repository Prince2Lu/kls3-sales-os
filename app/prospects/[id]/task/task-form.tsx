'use client'

// Task creation form (Phase 2.5)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createTaskAction } from '../../actions'

const TASK_TYPES = [
  'CALL',
  'EMAIL',
  'LINKEDIN',
  'MEETING',
  'DEMO',
  'FOLLOW_UP',
  'OTHER',
] as const

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

const OWNERS = ['Eric', 'Lilian'] as const

interface TaskFormProps {
  opportunityId: string
  contactId?: string
  currentOwner: 'Eric' | 'Lilian'
}

export function TaskForm({ opportunityId, contactId, currentOwner }: TaskFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setError(null)

    const date = formData.get('date') as string
    const time = formData.get('time') as string
    const dueAt = date && time ? `${date}T${time}:00.000Z` : undefined

    const data = {
      opportunityId,
      contactId,
      type: formData.get('type') as string,
      dueAt,
      priority: (formData.get('priority') as any) || undefined,
      notes: (formData.get('notes') as string) || undefined,
      owner: formData.get('owner') as any,
    }

    startTransition(async () => {
      const result = await createTaskAction(data)

      if (result.success) {
        router.push(`/prospects/${opportunityId}`)
        router.refresh()
      } else {
        setError(result.error || 'Erreur inconnue')
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-md p-4 text-red-500 text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Détails de la tâche</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Type <span className="text-red-500">*</span>
            </label>
            <Select name="type" required defaultValue="FOLLOW_UP">
              {TASK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Date d'échéance
              </label>
              <Input name="date" type="date" />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Heure</label>
              <Input name="time" type="time" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Priorité</label>
            <Select name="priority" defaultValue="MEDIUM">
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Owner <span className="text-red-500">*</span>
            </label>
            <Select name="owner" required defaultValue={currentOwner}>
              {OWNERS.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Notes</label>
            <Textarea name="notes" placeholder="Détails de la tâche..." rows={4} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Création...' : 'Créer la tâche'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Annuler
        </Button>
      </div>
    </form>
  )
}
