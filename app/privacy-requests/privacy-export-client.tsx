'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function PrivacyExportClient({ contacts }: { contacts: Array<{ id: string; name: string; email: string | null }> }) {
  const [contactId, setContactId] = useState('')
  return <div className="max-w-2xl rounded-xl border border-border bg-card p-6">
    <h2 className="text-xl font-semibold">Export d’accès</h2>
    <p className="mt-1 text-sm text-muted-foreground">Le fichier JSON contient les coordonnées et les données CRM directement rattachées au contact.</p>
    <label className="mt-4 block space-y-1 text-sm">
      <span>Contact</span>
      <select className="w-full rounded-lg border border-border bg-background px-3 py-2" value={contactId} onChange={(event) => setContactId(event.target.value)}>
        <option value="">Sélectionner…</option>
        {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name} · {contact.email ?? 'email manquant'}</option>)}
      </select>
    </label>
    <a href={contactId ? `/api/privacy/export?contactId=${encodeURIComponent(contactId)}` : undefined} download>
      <Button className="mt-4" disabled={!contactId}>Télécharger l’export JSON</Button>
    </a>
    <p className="mt-4 text-xs text-muted-foreground">Avant transmission, vérifier l’identité du demandeur et contrôler manuellement le contenu exporté.</p>
  </div>
}
