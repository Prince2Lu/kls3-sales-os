'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { EmailSuppression, EmailSuppressionReason } from '@/types/domain'
import { createManualSuppressionAction, reactivateSuppressionAction } from './actions'

type CompanyOption = { id: string; name: string; email: string | null }
type ContactOption = { id: string; companyId: string | null; name: string; email: string | null }

export function SuppressionsClient({ suppressions, companies, contacts }: {
  suppressions: EmailSuppression[]
  companies: CompanyOption[]
  contacts: ContactOption[]
}) {
  const [scope, setScope] = useState<'EMAIL' | 'COMPANY' | 'CONTACT'>('EMAIL')
  const [email, setEmail] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [contactId, setContactId] = useState('')
  const [reason, setReason] = useState<EmailSuppressionReason>('OPPOSED')
  const [details, setDetails] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = () => startTransition(async () => {
    setMessage(null)
    const result = await createManualSuppressionAction({ scope, email, companyId: companyId || undefined, contactId: contactId || undefined, reason, details })
    if (!result.success) return setMessage(result.error ?? 'Enregistrement impossible')
    setEmail(''); setCompanyId(''); setContactId(''); setDetails('')
    setMessage('Exclusion enregistrée. Elle sera contrôlée avant chaque envoi.')
  })

  const reactivate = (id: string) => startTransition(async () => {
    const result = await reactivateSuppressionAction(id)
    setMessage(result.success ? 'Exclusion réactivée.' : result.error ?? 'Modification impossible')
  })

  return <div className="space-y-6">
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">Ajouter une opposition</h2>
      <p className="mt-1 text-sm text-muted-foreground">Une opposition active prime toujours sur le statut de campagne. Elle ne peut pas être désactivée depuis cette page.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm"><span>Portée</span><select className="w-full rounded-lg border border-border bg-background px-3 py-2" value={scope} onChange={(event) => setScope(event.target.value as typeof scope)}><option value="EMAIL">Adresse email</option><option value="COMPANY">Entreprise entière</option><option value="CONTACT">Contact</option></select></label>
        <label className="space-y-1 text-sm"><span>Motif</span><select className="w-full rounded-lg border border-border bg-background px-3 py-2" value={reason} onChange={(event) => setReason(event.target.value as EmailSuppressionReason)}><option value="OPPOSED">Opposition</option><option value="UNSUBSCRIBED">Désabonnement</option><option value="HARD_BOUNCE">Hard bounce</option><option value="SPAM_COMPLAINT">Plainte spam</option><option value="INVALID_EMAIL">Email invalide</option><option value="MANUAL">Autre saisie manuelle</option></select></label>
        {scope === 'EMAIL' && <label className="space-y-1 text-sm"><span>Email</span><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="contact@office.fr" /></label>}
        {scope === 'COMPANY' && <label className="space-y-1 text-sm"><span>Entreprise</span><select className="w-full rounded-lg border border-border bg-background px-3 py-2" value={companyId} onChange={(event) => setCompanyId(event.target.value)}><option value="">Sélectionner…</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.email ?? 'email manquant'}</option>)}</select></label>}
        {scope === 'CONTACT' && <label className="space-y-1 text-sm"><span>Contact</span><select className="w-full rounded-lg border border-border bg-background px-3 py-2" value={contactId} onChange={(event) => setContactId(event.target.value)}><option value="">Sélectionner…</option>{contacts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.email ?? 'email manquant'}</option>)}</select></label>}
        <label className="space-y-1 text-sm"><span>Note</span><Input value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Demande reçue par téléphone…" /></label>
      </div>
      <Button className="mt-4" onClick={submit} disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer l’exclusion</Button>
      {message && <p className="mt-4 rounded-lg bg-muted p-3 text-sm">{message}</p>}
    </div>

    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">Historique</h2>
      <div className="mt-4 overflow-auto rounded-lg border border-border"><table className="w-full text-left text-sm"><thead className="bg-muted"><tr><th className="p-3">Email</th><th className="p-3">Portée</th><th className="p-3">Motif</th><th className="p-3">Source</th><th className="p-3">Date</th><th className="p-3">État</th><th className="p-3">Action</th></tr></thead><tbody>{suppressions.map((item) => <tr key={item.id} className="border-t border-border"><td className="p-3">{item.email}</td><td className="p-3">{item.scope}</td><td className="p-3">{item.reason}</td><td className="p-3">{item.source}</td><td className="p-3">{new Date(item.createdAt).toLocaleDateString('fr-FR')}</td><td className="p-3">{item.active ? 'Active' : 'Inactive'}</td><td className="p-3">{item.active ? '—' : <Button size="sm" variant="ghost" onClick={() => reactivate(item.id)} disabled={pending}>Réactiver</Button>}</td></tr>)}</tbody></table>{suppressions.length === 0 && <p className="p-4 text-sm text-muted-foreground">Aucune exclusion enregistrée.</p>}</div>
    </div>
  </div>
}
