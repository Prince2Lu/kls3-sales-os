'use client'

import { useMemo, useState, useTransition } from 'react'
import { Eye, Loader2, MailCheck, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { EmailCampaign, EmailRecipient } from '@/types/domain'
import type { BrevoSendMode } from '@/lib/prospecting/safety'
import {
  createCampaignDraftAction,
  previewCampaignEmailAction,
  sendCampaignAction,
  sendCampaignTestAction,
} from './actions'

interface SelectableCompany {
  id: string
  name: string
  city: string | null
  email: string
  recipientLabel: string
  blocked: boolean
}

interface SelectableTemplate {
  id: number
  name: string
  subject: string
  isActive: boolean
  modifiedAt: string | null
  senderName: string | null
  senderEmail: string | null
  replyTo: string | null
}

interface PreviewData {
  html: string
  subject: string
  fromName: string | null
  fromEmail: string | null
  previewText: string | null
}

export function CampaignsClient({
  campaigns,
  recipients,
  companies,
  templates,
  templateLoadError,
  sendMode,
  testRecipientEmail,
}: {
  campaigns: EmailCampaign[]
  recipients: EmailRecipient[]
  companies: SelectableCompany[]
  templates: SelectableTemplate[]
  templateLoadError: string | null
  sendMode: BrevoSendMode
  testRecipientEmail: string | null
}) {
  const [name, setName] = useState('Campagne notaires')
  const [subject, setSubject] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [selected, setSelected] = useState<string[]>(() => {
    if (sendMode === 'test' && testRecipientEmail) {
      return companies
        .filter((item) => !item.blocked && item.email.toLowerCase() === testRecipientEmail.toLowerCase())
        .slice(0, 1)
        .map((item) => item.id)
    }
    return []
  })
  const [pending, startTransition] = useTransition()

  const selectedTemplate = templates.find((item) => String(item.id) === templateId) ?? null

  const filteredCompanies = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return companies
    return companies.filter((company) =>
      [company.name, company.city ?? '', company.email, company.recipientLabel]
        .some((value) => value.toLowerCase().includes(normalized))
    )
  }, [companies, query])

  const onTemplateChange = (value: string) => {
    setTemplateId(value)
    setPreview(null)
    const template = templates.find((item) => String(item.id) === value)
    if (template && !subject.trim()) setSubject(template.subject)
  }

  const selectVisible = () => {
    if (sendMode === 'test' && testRecipientEmail) {
      setSelected(
        companies
          .filter((item) => !item.blocked && item.email.toLowerCase() === testRecipientEmail.toLowerCase())
          .slice(0, 1)
          .map((item) => item.id)
      )
      return
    }
    setSelected(filteredCompanies.filter((item) => !item.blocked).slice(0, 25).map((item) => item.id))
  }

  const createDraft = () => startTransition(async () => {
    if (!templateId) {
      setMessage('Choisissez un modèle Brevo.')
      return
    }
    const result = await createCampaignDraftAction({ name, subject, companyIds: selected, templateId })
    setMessage(
      result.success
        ? `Brouillon créé avec ${result.recipientCount} destinataire(s), dont ${result.excluded} exclu(s).`
        : result.error ?? 'Erreur'
    )
  })

  const showPreview = () => startTransition(async () => {
    if (!templateId || selected.length === 0) {
      setMessage('Choisissez un modèle et au moins un office.')
      return
    }
    const result = await previewCampaignEmailAction({ templateId, companyId: selected[0] })
    if (!result.success || !('preview' in result) || !result.preview) {
      setMessage('error' in result ? result.error ?? "Impossible de générer l'aperçu." : "Impossible de générer l'aperçu.")
      return
    }
    setPreview(result.preview)
    setMessage(null)
  })

  const sendTest = () => startTransition(async () => {
    if (!templateId) {
      setMessage('Choisissez un modèle Brevo.')
      return
    }
    const result = await sendCampaignTestAction(templateId)
    setMessage(
      result.success && 'email' in result
        ? `Mail test envoyé à ${result.email}.`
        : ('error' in result ? result.error ?? 'Erreur' : 'Erreur')
    )
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
      <p className="mt-1 text-sm text-muted-foreground">
        Sélectionnez les offices, choisissez le message Brevo, vérifiez le rendu puis créez le brouillon. Limite pilote : 25.
      </p>

      <p className={`mt-3 rounded-lg border p-3 text-sm ${sendMode === 'disabled' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-border bg-muted'}`}>
        {sendMode === 'disabled' && 'Envoi verrouillé par configuration.'}
        {sendMode === 'test' && `Mode test : seul ${testRecipientEmail ?? 'le destinataire de test configuré'} peut recevoir un email.`}
        {sendMode === 'live' && 'Mode réel actif : les destinataires autorisés seront contactés.'}
      </p>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium">1. Destinataires</p>
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un office, une ville ou un email…" />
        <div className="mt-3 rounded-lg border border-border">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted px-3 py-2 text-sm">
            <span>{selected.length} office(s) sélectionné(s)</span>
            <button className="text-accent" onClick={selectVisible}>
              {sendMode === 'test' ? 'Sélectionner le destinataire test' : 'Sélectionner les résultats visibles'}
            </button>
          </div>
          <div className="max-h-64 overflow-auto">
            {filteredCompanies.map((company) => <label key={company.id} className="flex items-center gap-3 border-b border-border px-3 py-2 text-sm last:border-0">
              <input
                type="checkbox"
                checked={selected.includes(company.id)}
                disabled={company.blocked || (!selected.includes(company.id) && selected.length >= 25)}
                onChange={(event) => setSelected((current) =>
                  event.target.checked ? [...current, company.id].slice(0, 25) : current.filter((id) => id !== company.id)
                )}
              />
              <span className="flex-1">
                <span className="font-medium">{company.name}</span>
                <span className="text-muted-foreground"> · {company.city ?? 'Ville inconnue'} · {company.recipientLabel}</span>
              </span>
              {company.blocked && <span className="text-xs text-destructive">Exclu</span>}
            </label>)}
            {filteredCompanies.length === 0 && <p className="p-4 text-sm text-muted-foreground">Aucun office trouvé.</p>}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-sm font-medium">2. Message</p>
        {templateLoadError && <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{templateLoadError}</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nom de campagne" />
          <select
            value={templateId}
            onChange={(event) => onTemplateChange(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Choisir un modèle Brevo</option>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
        </div>
        <div className="mt-4">
          <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Objet de l’email" />
          {selectedTemplate && <p className="mt-2 text-xs text-muted-foreground">
            Modèle : {selectedTemplate.name}
            {selectedTemplate.modifiedAt ? ` · modifié le ${new Date(selectedTemplate.modifiedAt).toLocaleDateString('fr-FR')}` : ''}
          </p>}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="ghost" onClick={showPreview} disabled={pending || !templateId || selected.length === 0}>
            <Eye className="mr-2 h-4 w-4" />Aperçu du mail
          </Button>
          <Button variant="ghost" onClick={sendTest} disabled={pending || !templateId || !testRecipientEmail}>
            <MailCheck className="mr-2 h-4 w-4" />M’envoyer un test
          </Button>
        </div>
      </div>

      {preview && <div className="mt-5 overflow-hidden rounded-xl border border-border">
        <div className="border-b border-border bg-muted p-3 text-sm">
          <p className="font-medium">{preview.subject || subject}</p>
          <p className="text-xs text-muted-foreground">
            De : {preview.fromName ?? selectedTemplate?.senderName ?? '—'} &lt;{preview.fromEmail ?? selectedTemplate?.senderEmail ?? '—'}&gt;
          </p>
        </div>
        <iframe title="Aperçu de l’email" sandbox="" srcDoc={preview.html} className="h-[520px] w-full bg-white" />
      </div>}

      <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-sm font-medium">3. Vérification</p>
        <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
          <p>Campagne : <span className="font-medium">{name || '—'}</span></p>
          <p>Modèle : <span className="font-medium">{selectedTemplate?.name ?? '—'}</span></p>
          <p>Objet : <span className="font-medium">{subject || '—'}</span></p>
          <p>Destinataires : <span className="font-medium">{selected.length}</span></p>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={createDraft} disabled={pending || selected.length === 0 || !templateId || !subject.trim()}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer le brouillon
          </Button>
          <span className="text-xs text-muted-foreground">Aucun email n’est envoyé à cette étape.</span>
        </div>
      </div>

      {message && <p className="mt-4 rounded-lg bg-muted p-3 text-sm">{message}</p>}
    </div>

    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">Campagnes</h2>
      {campaigns.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Aucune campagne.</p> : <div className="mt-4 space-y-3">
        {campaigns.map((campaign) => {
          const related = recipients.filter((item) => item.campaignId === campaign.id)
          const counts = related.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.status]: (acc[item.status] ?? 0) + 1 }), {})
          const bounced = (counts.HARD_BOUNCE ?? 0) + (counts.SOFT_BOUNCE ?? 0) + (counts.FAILED ?? 0)
          return <div key={campaign.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium">{campaign.name}</p>
                <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {campaign.status} · {campaign.recipientCount} destinataire(s)
                  {' · '}{counts.DELIVERED ?? 0} délivré(s)
                  {' · '}{counts.OPENED ?? 0} ouvert(s)
                  {' · '}{counts.CLICKED ?? 0} clic(s)
                  {' · '}{counts.UNSUBSCRIBED ?? 0} désabonnement(s)
                  {' · '}{bounced} bounce/erreur
                  {' · '}{counts.EXCLUDED ?? 0} exclu(s)
                </p>
              </div>
              {campaign.status === 'DRAFT' && <Button onClick={() => send(campaign.id)} disabled={pending || sendMode === 'disabled'}>
                <Send className="mr-2 h-4 w-4" />Envoyer via Brevo
              </Button>}
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-accent">Voir les statuts individuels</summary>
              <div className="mt-2 max-h-72 overflow-auto rounded border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="p-2">Destinataire</th>
                      <th className="p-2">Statut</th>
                      <th className="p-2">Ouvertures</th>
                      <th className="p-2">Clics</th>
                      <th className="p-2">Dernier signal</th>
                    </tr>
                  </thead>
                  <tbody>{related.map((item) => <tr key={item.id} className="border-t border-border">
                    <td className="p-2">{item.email}</td>
                    <td className="p-2">{item.status}</td>
                    <td className="p-2">{item.openCount}</td>
                    <td className="p-2">{item.clickCount}</td>
                    <td className="p-2">{item.lastEventAt ? new Date(item.lastEventAt).toLocaleString('fr-FR') : '—'}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            </details>
          </div>
        })}
      </div>}
    </div>
  </div>
}
