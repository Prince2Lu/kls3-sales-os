'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { confirmDirectEmailSentAction, prepareDirectEmailAction } from './actions'

export function DirectEmailComposer({ contactId, contactName, email }: { contactId: string; contactName: string; email: string }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [recordId, setRecordId] = useState<string | null>(null)
  const [mailto, setMailto] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [pending, startTransition] = useTransition()

  const openInMailClient = () => {
    startTransition(async () => {
      setMessage(null)
      const result = await prepareDirectEmailAction({ contactId, subject, body })
      if (!result.success || !result.mailto || !result.recordId) {
        setMessage(result.error || 'Impossible de préparer le mail.')
        return
      }
      setRecordId(result.recordId)
      setMailto(result.mailto)
      setMessage('Le mail est prêt avec votre lien de carte personnalisé. Thunderbird va s’ouvrir.')
      window.location.href = result.mailto
    })
  }

  const confirmSent = () => {
    if (!recordId) return
    startTransition(async () => {
      try {
        await confirmDirectEmailSentAction({ recordId, contactId, subject })
        setConfirmed(true)
        setMessage('Envoi confirmé et activité enregistrée dans le CRM.')
      } catch {
        setMessage('Le mail a peut-être été envoyé, mais la confirmation CRM a échoué.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="grid gap-4">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Destinataire</div>
            <div className="font-medium">{contactName}</div>
            <div className="text-sm text-muted-foreground">{email}</div>
          </div>
          <div>
            <label htmlFor="subject" className="mb-2 block text-sm font-medium">Objet</label>
            <Input id="subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Objet du mail" disabled={pending || !!recordId} />
          </div>
          <div>
            <label htmlFor="body" className="mb-2 block text-sm font-medium">Message</label>
            <textarea id="body" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Rédigez votre message…" disabled={pending || !!recordId} rows={14} className="w-full rounded-md border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <div className="font-medium">Ajout automatique</div>
            <p className="mt-1 text-muted-foreground">Sales OS ajoute votre signature KLS3 et un lien personnel vers votre carte digitale. Le message s’ouvre ensuite dans votre logiciel mail habituel ; en l’envoyant depuis Thunderbird, il reste naturellement dans vos éléments envoyés.</p>
          </div>
          {message && <div className={'rounded-lg border p-3 text-sm ' + (confirmed ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-border bg-muted/40')}>{message}</div>}
          <div className="flex flex-wrap gap-3">
            {!recordId ? (
              <Button onClick={openInMailClient} disabled={pending || !subject.trim() || !body.trim()}>{pending ? 'Préparation…' : 'Ouvrir dans Thunderbird'}</Button>
            ) : !confirmed ? (
              <>
                <Button onClick={confirmSent} disabled={pending}>{pending ? 'Confirmation…' : 'J’ai envoyé le mail'}</Button>
                {mailto && <a href={mailto} className="inline-flex items-center text-sm text-accent hover:underline">Réouvrir le mail</a>}
              </>
            ) : (
              <Link href={'/contacts/' + contactId}><Button>Retour au contact</Button></Link>
            )}
            {!confirmed && <Link href={'/contacts/' + contactId}><Button variant="ghost">Annuler</Button></Link>}
          </div>
        </div>
      </div>
    </div>
  )
}
