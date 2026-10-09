'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sendDirectEmailAction } from './actions'

export function DirectEmailComposer({
  contactId,
  contactName,
  email,
  configured,
}: {
  contactId: string
  contactName: string
  email: string
  configured: boolean
}) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()

  const send = () => {
    if (!window.confirm(`Envoyer maintenant ce mail à ${email} ?`)) return

    startTransition(async () => {
      setMessage(null)
      setWarning(null)
      const result = await sendDirectEmailAction({ contactId, subject, body })
      if (!result.success) {
        setSuccess(false)
        setMessage(result.error || 'Échec de l’envoi.')
        return
      }

      setSuccess(true)
      setMessage('Mail envoyé. Le lien personnel vers votre carte a été ajouté automatiquement.')
      setWarning(result.warning || null)
    })
  }

  return (
    <div className="space-y-6">
      {!configured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          La boîte mail n’est pas encore configurée dans Sales OS. Vous pouvez préparer le message, mais l’envoi restera bloqué jusqu’à l’ajout des paramètres SMTP/IMAP.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="grid gap-4">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Destinataire</div>
            <div className="font-medium">{contactName}</div>
            <div className="text-sm text-muted-foreground">{email}</div>
          </div>

          <div>
            <label htmlFor="subject" className="mb-2 block text-sm font-medium">Objet</label>
            <Input
              id="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Objet du mail"
              disabled={pending || success}
            />
          </div>

          <div>
            <label htmlFor="body" className="mb-2 block text-sm font-medium">Message</label>
            <textarea
              id="body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Rédigez votre message…"
              disabled={pending || success}
              rows={14}
              className="w-full rounded-md border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <div className="font-medium">Ajout automatique</div>
            <p className="mt-1 text-muted-foreground">
              Sales OS ajoutera votre signature KLS3 et un lien personnel vers votre carte digitale. Les consultations et clics pourront ensuite être attribués à ce contact.
            </p>
          </div>

          {message && (
            <div className={`rounded-lg border p-3 text-sm ${success ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-destructive/30 bg-destructive/10'}`}>
              {message}
            </div>
          )}
          {warning && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              {warning}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {!success ? (
              <Button onClick={send} disabled={pending || !configured || !subject.trim() || !body.trim()}>
                {pending ? 'Envoi…' : 'Envoyer le mail'}
              </Button>
            ) : (
              <Link href={`/contacts/${contactId}`}>
                <Button>Retour au contact</Button>
              </Link>
            )}
            {!success && (
              <Link href={`/contacts/${contactId}`}>
                <Button variant="ghost">Annuler</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
