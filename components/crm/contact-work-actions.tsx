'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CreateActivityModal } from '@/components/pipeline/create-activity-modal'
import { CreateTaskModal } from '@/components/pipeline/create-task-modal'
import { createManualTask } from '@/lib/actions/task-actions'
import type { Contact } from '@/types/domain'

type ContactChoice = Pick<Contact, 'id' | 'firstName' | 'lastName'>

/** Direct actions work for every contact, independently of prospecting or opportunities. */
export function ContactWorkActions({ contacts }: { contacts: ContactChoice[] }) {
  const router = useRouter()
  const id = useId()
  const [contactId, setContactId] = useState(contacts.length === 1 ? contacts[0].id : '')
  const [mode, setMode] = useState<'activity' | 'task' | 'meeting' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const ready = Boolean(contactId)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {contacts.length > 1 && <>
        <label htmlFor={id} className="text-sm">Contact</label>
        <select id={id} value={contactId} onChange={e => setContactId(e.target.value)} className="max-w-full rounded-lg border border-border bg-card-bg px-2 py-2 text-sm">
          <option value="">Choisir un contact</option>
          {contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
        </select>
      </>}
      <Button size="sm" disabled={!ready || saving} onClick={() => setMode('meeting')}>Planifier un rendez-vous</Button>
      <Button size="sm" variant="ghost" disabled={!ready || saving} onClick={() => setMode('task')}>+ Tâche</Button>
      <Button size="sm" variant="ghost" disabled={!ready || saving} onClick={() => setMode('activity')}>+ Activité réalisée</Button>
      {contacts.length === 0 && <p className="text-xs text-text-muted">Ajoutez un contact pour lui rattacher un rendez-vous ou une activité.</p>}
      {error && <p role="alert" className="w-full text-sm text-red-500">{error}</p>}
      {mode === 'activity' && <CreateActivityModal contactId={contactId} onClose={() => setMode(null)} />}
      {(mode === 'task' || mode === 'meeting') && <CreateTaskModal
        initialType={mode === 'meeting' ? 'MEETING' : undefined}
        pending={saving}
        error={error}
        onCancel={() => { if (!saving) setMode(null) }}
        onConfirm={async data => {
          if (saving) return
          setSaving(true); setError('')
          try {
            const result = await createManualTask({ contactId, ...data })
            if (!result.success) { setError(result.error || 'Impossible de créer la tâche.'); return }
            setMode(null); router.refresh()
          } catch { setError('Impossible de créer la tâche. Réessayez.') }
          finally { setSaving(false) }
        }}
      />}
    </div>
  )
}
