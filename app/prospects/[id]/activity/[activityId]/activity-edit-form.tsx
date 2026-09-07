'use client'

// Activity edit form (workflow enhancement)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { updateActivityAction } from '../../../actions'
import type { Activity } from '@/types/domain'

const ACTIVITY_TYPES = [
  'CALL',
  'EMAIL',
  'LINKEDIN',
  'MEETING',
  'DEMO',
  'PROPOSAL',
  'NOTE',
  'OTHER',
] as const

const ACTIVITY_RESULTS = [
  'NO_ANSWER',
  'CONVERSATION',
  'MEETING_BOOKED',
  'NOT_INTERESTED',
  'CALLBACK',
] as const

const OWNERS = ['Eric', 'Lilian'] as const

interface ActivityEditFormProps {
  activityId: string
  opportunityId: string
  activity: Activity
  currentOwner: 'Eric' | 'Lilian'
}

export function ActivityEditForm({
  activityId,
  opportunityId,
  activity,
  currentOwner,
}: ActivityEditFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Parse existing date/time
  const activityDate = new Date(activity.date)
  const defaultDate = activityDate.toISOString().split('T')[0]
  const defaultTime = activityDate.toTimeString().slice(0, 5)

  async function handleSubmit(formData: FormData) {
    setError(null)

    const date = formData.get('date') as string
    const time = formData.get('time') as string

    // Create ISO datetime from local date/time inputs
    // Date and time inputs are in user's local timezone
    const localDateTime = new Date(`${date}T${time}:00`)
    const datetime = localDateTime.toISOString()

    const data = {
      type: formData.get('type') as string,
      date: datetime,
      result: (formData.get('result') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined,
      owner: formData.get('owner') as any,
      durationMinutes: formData.get('durationMinutes')
        ? Number(formData.get('durationMinutes'))
        : undefined,
    }

    startTransition(async () => {
      const result = await updateActivityAction(activityId, opportunityId, data)

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
          <CardTitle className="text-lg">Détails de l'activité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Type <span className="text-red-500">*</span>
            </label>
            <Select name="type" required defaultValue={activity.type}>
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Date <span className="text-red-500">*</span>
              </label>
              <Input name="date" type="date" required defaultValue={defaultDate} />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Heure <span className="text-red-500">*</span>
              </label>
              <Input name="time" type="time" required defaultValue={defaultTime} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Résultat</label>
            <Select name="result" defaultValue={activity.result || ''}>
              <option value="">Aucun</option>
              {ACTIVITY_RESULTS.map((result) => (
                <option key={result} value={result}>
                  {result}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Owner <span className="text-red-500">*</span>
            </label>
            <Select name="owner" required defaultValue={activity.owner}>
              {OWNERS.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Durée (minutes)
            </label>
            <Input
              name="durationMinutes"
              type="number"
              min="0"
              step="5"
              placeholder="Ex: 30"
              defaultValue={activity.durationMinutes || ''}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Notes</label>
            <Textarea
              name="notes"
              placeholder="Détails de l'activité..."
              rows={4}
              defaultValue={activity.notes || ''}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Enregistrement...' : 'Enregistrer'}
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
