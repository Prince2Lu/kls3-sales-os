'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createGenericActivity, updateGenericActivity } from '@/lib/actions/activity-actions'
import { getParisFormDateTime } from '@/lib/utils/contact-history'
import { createISOFromParisDateTime } from '@/lib/utils/timezone'
import { getFrenchActivityType } from '@/lib/utils/french-labels'
import type { Activity, ActivityResult, ActivityType } from '@/types/domain'

const TYPES: ActivityType[] = ['CALL','EMAIL','LINKEDIN','MEETING','DEMO','PROPOSAL','NOTE','OTHER']
const RESULTS: { value: ActivityResult; label: string }[] = [
  { value: 'NO_ANSWER', label: 'Sans réponse' }, { value: 'CONVERSATION', label: 'Conversation' },
  { value: 'MEETING_BOOKED', label: 'RDV obtenu' }, { value: 'NOT_INTERESTED', label: 'Pas intéressé' },
  { value: 'CALLBACK', label: 'Rappel demandé' }, { value: 'WRONG_NUMBER', label: 'Mauvais numéro' },
  { value: 'VOICEMAIL', label: 'Message vocal' }, { value: 'EMAIL_REQUESTED', label: 'Email demandé' },
  { value: 'EMAIL_SENT', label: 'Email envoyé' }, { value: 'EMAIL_REPLY', label: 'Réponse email' },
  { value: 'LINKEDIN_SENT', label: 'Message LinkedIn envoyé' }, { value: 'LINKEDIN_REPLY', label: 'Réponse LinkedIn' },
]

export function CreateActivityModal({ contactId, opportunityId, coldCallTargetId, activity, onClose }: {
  contactId?: string; opportunityId?: string; coldCallTargetId?: string
  revalidatePaths?: string[]; activity?: Activity; onClose: () => void
}) {
  const router = useRouter()
  const id = useId()
  const [initial] = useState(() => getParisFormDateTime(activity?.date || new Date()))
  const [type, setType] = useState<ActivityType>(activity?.type || 'CALL')
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)
  const [result, setResult] = useState<ActivityResult | ''>(activity?.result || '')
  const [notes, setNotes] = useState(activity?.notes || '')
  const [duration, setDuration] = useState(activity?.durationMinutes?.toString() || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const selectedDate = createISOFromParisDateTime(date, time)
      // Retain the exact instant for unchanged legacy activities (including seconds).
      const datetime = activity && date === initial.date && time === initial.time ? activity.date : selectedDate
      const details = { type, date: datetime, result, notes, durationMinutes: duration === '' ? undefined : Number(duration) }
      const response = activity
        ? await updateGenericActivity(activity.id, details)
        : await createGenericActivity({ contactId, opportunityId, coldCallTargetId, ...details })
      if (!response.success) { setError(response.error || "Impossible d’enregistrer l’activité."); return }
      onClose()
      router.refresh()
    } catch { setError("Impossible d’enregistrer l’activité. Vérifiez la date et réessayez.") }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} onKeyDown={e => { if (e.key === 'Escape' && !saving) onClose() }}>
      <Card className="max-w-md w-full p-5 max-h-[85dvh] overflow-y-auto">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <h3 id={`${id}-title`} className="text-lg font-bold font-syne">{activity ? 'Modifier l’activité' : 'Ajouter une activité réalisée'}</h3>
            <p className="text-xs text-text-muted mt-1">Compte rendu d’une action réalisée. Pour le futur, planifiez un rendez-vous ou une tâche.</p>
          </div>
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <div>
            <label htmlFor={`${id}-type`} className="text-sm font-medium">Type</label>
            <Select id={`${id}-type`} value={type} onChange={e => setType(e.target.value as ActivityType)} autoFocus>
              {TYPES.map(t => <option key={t} value={t}>{getFrenchActivityType(t)}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor={`${id}-date`} className="text-sm font-medium">Date (Paris)</label><Input id={`${id}-date`} type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
            <div><label htmlFor={`${id}-time`} className="text-sm font-medium">Heure (Paris)</label><Input id={`${id}-time`} type="time" value={time} onChange={e => setTime(e.target.value)} required /></div>
          </div>
          <div>
            <label htmlFor={`${id}-result`} className="text-sm font-medium">Résultat</label>
            <Select id={`${id}-result`} value={result} onChange={e => setResult(e.target.value as ActivityResult | '')}>
              <option value="">Aucun</option>
              {RESULTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
          </div>
          <div><label htmlFor={`${id}-duration`} className="text-sm font-medium">Durée (minutes)</label><Input id={`${id}-duration`} type="number" min="0" value={duration} onChange={e => setDuration(e.target.value)} /></div>
          <div><label htmlFor={`${id}-notes`} className="text-sm font-medium">Notes</label><Textarea id={`${id}-notes`} rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Compte rendu de l’échange…" /></div>
          <div className="flex gap-3">
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
            <Button type="button" variant="ghost" disabled={saving} onClick={onClose} className="flex-1">Annuler</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
