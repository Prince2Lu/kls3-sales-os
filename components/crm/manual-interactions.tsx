'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CreateTaskModal } from '@/components/pipeline/create-task-modal'
import { addManualActivity, addManualFollowUp } from '@/lib/actions/manual-interactions'
import type { ActivityType, TaskType, Priority } from '@/types/domain'

type ContactChoice = { id: string; label: string }

export function ManualInteractions({ contacts, coldCallTargetId }: { contacts: ContactChoice[]; coldCallTargetId?: string }) {
  const router = useRouter()
  const [contactId, setContactId] = useState(contacts.length === 1 ? contacts[0].id : '')
  const [mode, setMode] = useState<'activity' | 'task' | 'task-form' | null>(null)
  const [type, setType] = useState<ActivityType>('EMAIL')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function saveActivity(e: React.FormEvent) {
    e.preventDefault()
    if (!contactId) { setError('Sélectionner un contact'); return }
    setSaving(true)
    setError('')
    const result = await addManualActivity({
      contactId, coldCallTargetId, type,
      date: new Date(date + 'T12:00:00').toISOString(), notes,
    })
    setSaving(false)
    if (result.success) { setMode(null); setNotes(''); router.refresh() }
    else setError(result.error || 'Erreur')
  }

  async function saveTask(data: { type: TaskType; dueAt: string; priority: Priority; notes?: string }) {
    if (!contactId) { setError('Sélectionner un contact'); return }
    setSaving(true)
    setError('')
    const result = await addManualFollowUp({ contactId, coldCallTargetId, ...data, notes: data.notes || '' })
    setSaving(false)
    if (result.success) { setMode(null); router.refresh() }
    else setError(result.error || 'Erreur')
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => { setError(''); setMode('activity') }}>+ Activité</Button>
        <Button size="sm" variant="ghost" onClick={() => { setError(''); setMode('task') }}>+ Tâche</Button>
      </div>
      {(mode === 'activity' || mode === 'task') && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full max-h-[90vh] overflow-y-auto rounded-xl bg-card-bg border border-border p-5 space-y-4">
            <h3 className="text-lg font-bold">{mode === 'activity' ? 'Ajouter une activité' : 'Ajouter une tâche'}</h3>
            <label className="block text-sm">Contact associé
              <select className="w-full mt-1 p-2 rounded border border-border bg-card-bg" value={contactId} onChange={e => setContactId(e.target.value)}>
                <option value="">Sélectionner</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            {mode === 'activity' ? (
              <form className="space-y-3" onSubmit={saveActivity}>
                <label className="block text-sm">Type
                  <select className="w-full mt-1 p-2 rounded border border-border bg-card-bg" value={type} onChange={e => setType(e.target.value as ActivityType)}>
                    {([['EMAIL','Email'],['CALL','Appel'],['MEETING','Réunion'],['LINKEDIN','LinkedIn'],['NOTE','Note'],['OTHER','WhatsApp / Autre'],['DEMO','Démo'],['PROPOSAL','Proposition']] as const).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <label className="block text-sm">Date
                  <input required type="date" className="w-full mt-1 p-2 rounded border border-border bg-card-bg" value={date} onChange={e => setDate(e.target.value)}/>
                </label>
                <label className="block text-sm">Compte rendu
                  <textarea required rows={4} className="w-full mt-1 p-2 rounded border border-border bg-card-bg" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Objet, échange, résultat..."/>
                </label>
                {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving || !contactId}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
                  <Button type="button" variant="ghost" onClick={() => setMode(null)}>Annuler</Button>
                </div>
              </form>
            ) : (
              <>
                {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
                <p className="text-xs text-text-muted">Sélectionnez le contact, puis renseignez la tâche.</p>
                <Button disabled={!contactId} onClick={() => setMode('task-form')}>Continuer</Button>
                <Button variant="ghost" onClick={() => setMode(null)}>Annuler</Button>
              </>
            )}
          </div>
        </div>
      )}
      {mode === 'task-form' && (
        <CreateTaskModal onConfirm={saveTask} onCancel={() => setMode(null)} />
      )}
    </>
  )
}
