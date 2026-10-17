'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createGenericActivity } from '@/lib/actions/activity-actions'
import type { ActivityResult, ActivityType } from '@/types/domain'

const TYPES: ActivityType[] = ['CALL','EMAIL','LINKEDIN','MEETING','DEMO','PROPOSAL','NOTE','OTHER']
const RESULTS: ActivityResult[] = ['NO_ANSWER','CONVERSATION','MEETING_BOOKED','NOT_INTERESTED','CALLBACK','WRONG_NUMBER','VOICEMAIL','EMAIL_REQUESTED','EMAIL_SENT','EMAIL_REPLY','LINKEDIN_SENT','LINKEDIN_REPLY']

export function CreateActivityModal({
  contactId,
  opportunityId,
  coldCallTargetId,
  revalidatePaths,
  onClose,
}: {
  contactId?: string
  opportunityId?: string
  coldCallTargetId?: string
  revalidatePaths?: string[]
  onClose: () => void
}) {
  const router = useRouter()
  const now = new Date()
  const [type, setType] = useState<ActivityType>('CALL')
  const [date, setDate] = useState(now.toISOString().split('T')[0])
  const [time, setTime] = useState(now.toTimeString().slice(0,5))
  const [result, setResult] = useState<ActivityResult | ''>('')
  const [notes, setNotes] = useState('')
  const [duration, setDuration] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const response = await createGenericActivity({
      contactId,
      opportunityId,
      coldCallTargetId,
      type,
      date: new Date(`${date}T${time}:00`).toISOString(),
      result: result || undefined,
      notes: notes.trim() || undefined,
      durationMinutes: duration ? Number(duration) : undefined,
      revalidatePaths,
    })
    setSaving(false)
    if (!response.success) {
      alert(response.error || "Erreur lors de la création de l'activité")
      return
    }
    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-5 max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <h3 className="text-lg font-bold font-syne">Créer une activité</h3>
            <p className="text-xs text-text-muted mt-1">Enregistrer un échange ou une information CRM</p>
          </div>
          <div>
            <label className="text-sm font-medium">Type</label>
            <Select value={type} onChange={(e)=>setType(e.target.value as ActivityType)}>
              {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium">Date</label><Input type="date" value={date} onChange={e=>setDate(e.target.value)} required /></div>
            <div><label className="text-sm font-medium">Heure</label><Input type="time" value={time} onChange={e=>setTime(e.target.value)} required /></div>
          </div>
          <div>
            <label className="text-sm font-medium">Résultat</label>
            <Select value={result} onChange={e=>setResult(e.target.value as ActivityResult | '')}>
              <option value="">Aucun</option>
              {RESULTS.map(r=><option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
          <div><label className="text-sm font-medium">Durée (minutes)</label><Input type="number" min="0" step="5" value={duration} onChange={e=>setDuration(e.target.value)} /></div>
          <div><label className="text-sm font-medium">Notes</label><Textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Compte rendu, contexte, prochaine étape..." /></div>
          <div className="flex gap-3">
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Annuler</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
