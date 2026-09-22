'use client'

import { useState, useTransition } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { EmailCampaign, EmailRecipient } from '@/types/domain'
import type { BrevoSendMode } from '@/lib/prospecting/safety'
import { createCampaignDraftAction, sendCampaignAction } from './actions'

interface SelectableCompany { id: string; name: string; city: string | null; email: string; recipientLabel: string; blocked: boolean }

export function CampaignsClient({ campaigns, recipients, companies, sendMode, testRecipientEmail }: { campaigns: EmailCampaign[]; recipients: EmailRecipient[]; companies: SelectableCompany[]; sendMode: BrevoSendMode; testRecipientEmail: string | null }) {
  const [name, setName] = useState('Pilote notaires')
  const [subject, setSubject] = useState('Une solution pensée pour votre office notarial')
  const [message, setMessage] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>(() => {
    if (sendMode === 'test' && testRecipientEmail) {
      return companies.filter((item) => !item.blocked && item.email.toLowerCase() === testRecipientEmail.toLowerCase()).slice(0, 1).map((item) => item.id)
    }
    return []
  })
  const [pending, startTransition] = useTransition()
  const createDraft = () => startTransition(async () => {
    const result = await createCampaignDraftAction({ name, subject, companyIds: selected })
    setMessage(result.success ? `Brouillon créé avec ${result.recipientCount} destinataire(s), dont ${result.excluded} exclu(s).` : result.error ?? 'Erreur')
  })
  const send = (id: string) => {
    if (!window.confirm("Envoyer maintenant cette campagne via Brevo ? Cette action contacte réellement tous les destinataires au statut Prêt.")) return
    startTransition(async () => {
      const result = await sendCampaignAction(id)
      setMessage(result.success ? (result.warning ?? 'Campagne transmise à Brevo.') : result.error ?? 'Erreur')
    })
  }

  return <div className="space-y-6">
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">Préparer une campagne</h2>
      <p className="mt-1 text-sm text-muted-foreground">Un seul destinataire par office : contact décideur avec email direct, sinon email générique de l’étude. Limite pilote : 25.</p>
      <p className={`mt-3 rounded-lg border p-3 text-sm ${sendMode === 'disabled' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-border bg-muted'}`}>
        {sendMode === 'disabled' && 'Envoi verrouillé par configuration.'}
        {sendMode === 'test' && `Mode test : seul ${testRecipientEmail ?? 'le destinataire de test configuré'} peut recevoir un email.`}
        {sendMode === 'live' && 'Mode réel actif : les destinataires autorisés seront contactés.'}
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nom de campagne" /><Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Objet" /></div>
      <div className="mt-4 rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border bg-muted px-3 py-2 text-sm"><span>{selected.length} office(s) sélectionné(s)</span><button className="text-accent" onClick={() => setSelected(sendMode === 'test' && testRecipientEmail ? companies.filter((item) => !item.blocked && item.email.toLowerCase() === testRecipientEmail.toLowerCase()).slice(0, 1).map((item) => item.id) : companies.filter((item) => !item.blocked).slice(0, 25).map((item) => item.id))}>{sendMode === 'test' ? 'Sélectionner le destinataire test' : 'Sélectionner les 25 premiers'}</button></div>
        <div className="max-h-64 overflow-auto">{companies.map((company) => <label key={company.id} className="flex items-center gap-3 border-b border-border px-3 py-2 text-sm last:border-0">
          <input type="checkbox" checked={selected.includes(company.id)} disabled={company.blocked || (!selected.includes(company.id) && selected.length >= 25)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, company.id].slice(0, 25) : current.filter((id) => id !== company.id))} />
          <span className="flex-1"><span className="font-medium">{company.name}</span> <span className="text-muted-foreground">· {company.city ?? 'Ville inconnue'} · {company.recipientLabel}</span></span>
          {company.blocked && <span className="text-xs text-destructive">Exclu</span>}
        </label>)}</div>
      </div>
      <div className="mt-4 flex items-center gap-3"><Button onClick={createDraft} disabled={pending || selected.length === 0}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Créer le brouillon</Button><span className="text-xs text-muted-foreground">Aucun email n’est envoyé à cette étape.</span></div>
      {message && <p className="mt-4 rounded-lg bg-muted p-3 text-sm">{message}</p>}
    </div>
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">Campagnes</h2>
      {campaigns.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Aucune campagne.</p> : <div className="mt-4 space-y-3">{campaigns.map((campaign) => {
        const related = recipients.filter((item) => item.campaignId === campaign.id)
        const counts = related.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.status]: (acc[item.status] ?? 0) + 1 }), {})
        return <div key={campaign.id} className="rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-medium">{campaign.name}</p><p className="text-sm text-muted-foreground">{campaign.subject}</p><p className="mt-1 text-xs text-muted-foreground">{campaign.status} · {campaign.recipientCount} destinataires · {counts.CLICKED ?? 0} clic(s) · {counts.UNSUBSCRIBED ?? 0} désabonnement(s) · {counts.EXCLUDED ?? 0} exclu(s)</p></div>
          {campaign.status === 'DRAFT' && <Button onClick={() => send(campaign.id)} disabled={pending || sendMode === 'disabled'}><Send className="mr-2 h-4 w-4" />Envoyer via Brevo</Button>}</div>
          <details className="mt-3"><summary className="cursor-pointer text-sm text-accent">Voir les statuts individuels</summary>
            <div className="mt-2 max-h-64 overflow-auto rounded border border-border"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-muted"><tr><th className="p-2">Destinataire</th><th className="p-2">Statut</th><th className="p-2">Ouvertures</th><th className="p-2">Clics</th><th className="p-2">Dernier signal</th></tr></thead><tbody>{related.map((item) => <tr key={item.id} className="border-t border-border"><td className="p-2">{item.email}</td><td className="p-2">{item.status}</td><td className="p-2">{item.openCount}</td><td className="p-2">{item.clickCount}</td><td className="p-2">{item.lastEventAt ? new Date(item.lastEventAt).toLocaleString('fr-FR') : '—'}</td></tr>)}</tbody></table></div>
          </details>
        </div>
      })}</div>}
    </div>
  </div>
}
