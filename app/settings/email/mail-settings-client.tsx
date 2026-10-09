'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { saveMailSettingsAction, testMailSettingsAction } from './actions'
import type { Owner } from '@/types/domain'

type PublicSettings = {
  owner: Owner
  fromName: string
  fromEmail: string
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  smtpPasswordConfigured: boolean
  imapHost: string
  imapPort: number
  imapSecure: boolean
  imapUser: string
  imapPasswordConfigured: boolean
  sentMailbox: string
  updatedAt: string | null
}

function MailboxCard({ settings }: { settings: PublicSettings }) {
  const [message, setMessage] = useState<string | null>(null)
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const save = (formData: FormData) => {
    startTransition(async () => {
      setMessage(null)
      setTestMessage(null)
      const result = await saveMailSettingsAction(formData)
      setMessage(result.success ? 'Configuration enregistrée.' : result.error || 'Échec de l’enregistrement.')
    })
  }

  const test = () => {
    startTransition(async () => {
      setTestMessage('Test des connexions SMTP et IMAP…')
      const result = await testMailSettingsAction(settings.owner)
      setTestMessage(
        [
          result.smtpOk ? 'SMTP ✓' : `SMTP ✕ ${result.smtpMessage || ''}`,
          result.imapOk ? 'IMAP ✓' : `IMAP ✕ ${result.imapMessage || ''}`,
        ].join(' · ')
      )
    })
  }

  return (
    <form action={save} className="rounded-xl border border-border bg-card p-6">
      <input type="hidden" name="owner" value={settings.owner} />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{settings.owner}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {settings.updatedAt
              ? `Dernière mise à jour : ${new Date(settings.updatedAt).toLocaleString('fr-FR')}`
              : 'Pas encore configuré'}
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={test} disabled={pending || !settings.smtpPasswordConfigured}>
          Tester la connexion
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <h3 className="font-medium">Identité d’envoi</h3>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Nom affiché</label>
            <Input name="fromName" defaultValue={settings.fromName} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Adresse email</label>
            <Input name="fromEmail" type="email" defaultValue={settings.fromEmail} required />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-medium">SMTP — envoi</h3>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Serveur SMTP</label>
            <Input name="smtpHost" defaultValue={settings.smtpHost} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Port</label>
              <Input name="smtpPort" type="number" defaultValue={settings.smtpPort} required />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input name="smtpSecure" type="checkbox" defaultChecked={settings.smtpSecure} />
              SSL/TLS
            </label>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Utilisateur SMTP</label>
            <Input name="smtpUser" defaultValue={settings.smtpUser} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Mot de passe SMTP</label>
            <Input
              name="smtpPassword"
              type="password"
              autoComplete="new-password"
              placeholder={settings.smtpPasswordConfigured ? '•••••••• — laisser vide pour conserver' : 'Mot de passe de la boîte'}
            />
          </div>
        </section>

        <section className="space-y-4 lg:col-start-2">
          <h3 className="font-medium">IMAP — dossier Envoyés</h3>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Serveur IMAP</label>
            <Input name="imapHost" defaultValue={settings.imapHost} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Port</label>
              <Input name="imapPort" type="number" defaultValue={settings.imapPort} required />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input name="imapSecure" type="checkbox" defaultChecked={settings.imapSecure} />
              SSL/TLS
            </label>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Utilisateur IMAP</label>
            <Input name="imapUser" defaultValue={settings.imapUser} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Mot de passe IMAP</label>
            <Input
              name="imapPassword"
              type="password"
              autoComplete="new-password"
              placeholder={settings.imapPasswordConfigured ? '•••••••• — laisser vide pour conserver' : 'Vide = même mot de passe que SMTP'}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Dossier Envoyés</label>
            <Input name="sentMailbox" defaultValue={settings.sentMailbox || 'Sent'} />
          </div>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer'}</Button>
        {message && <span className="text-sm text-muted-foreground">{message}</span>}
        {testMessage && <span className="text-sm text-muted-foreground">{testMessage}</span>}
      </div>
    </form>
  )
}

export function MailSettingsClient({ settings }: { settings: PublicSettings[] }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        PlanetHoster utilise généralement SMTP 465 SSL/TLS et IMAP 993 SSL/TLS. Le serveur prérempli est <strong className="text-foreground">mail.kls3-dev.com</strong> ; remplacez-le si PlanetHoster affiche un autre nom d’hôte dans votre panneau.
      </div>

      {settings.map((item) => (
        <MailboxCard key={item.owner} settings={item} />
      ))}
    </div>
  )
}
