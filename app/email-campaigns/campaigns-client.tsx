'use client'

import { useMemo, useState, useTransition } from 'react'
import { Eye, Loader2, MailCheck, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { EmailCampaign, EmailRecipient } from '@/types/domain'
import type { AudienceOffice } from '@/lib/brevo/campaign-audience'
import type { BrevoSendMode } from '@/lib/prospecting/safety'
import {
  createCampaignDraftAction,
  markCampaignReplyAction,
  previewCampaignEmailAction,
  sendCampaignAction,
  sendCampaignTestAction,
} from './actions'

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
  companies: AudienceOffice[]
  templates: SelectableTemplate[]
  templateLoadError: string | null
  sendMode: BrevoSendMode
  testRecipientEmail: string | null
}) {
  const [name, setName] = useState('Campagne notaires')
  const [subject, setSubject] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('')
  const [audienceFilter, setAudienceFilter] = useState<'ELIGIBLE' | 'SENT' | 'EXCLUDED' | 'ALL'>('ELIGIBLE')
  const [includePreviouslySent, setIncludePreviouslySent] = useState(false)
  const [chosen, setChosen] = useState<Record<string, string | null>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [selected, setSelected] = useState<string[]>(() => {
    if (sendMode === 'test' && testRecipientEmail) {
      return companies
        .filter((item) => item.options.some((option) => !option.blockedReason && option.email.toLowerCase() === testRecipientEmail.toLowerCase()))
        .slice(0, 1)
        .map((item) => item.id)
    }
    return []
  })
  const [pending, startTransition] = useTransition()

  const selectedTemplate = templates.find((item) => String(item.id) === templateId) ?? null
  const selectedCompanies = companies.filter((item) => selected.includes(item.id))
  const optionsFor = (company: AudienceOffice) => company.options.filter((item) => !item.blockedReason &&
    (sendMode !== 'test' || item.email.toLowerCase() === testRecipientEmail?.toLowerCase()))
  const chosenOption = (company: AudienceOffice) => {
    const options = optionsFor(company)
    return company.id in chosen ? options.find((item) => item.contactId === chosen[company.id]) ?? null
      : options.length === 1 ? options[0] : null
  }
  const resolved = selectedCompanies.map((company) => ({ company, option: chosenOption(company) }))
  const unresolved = resolved.filter((item) => !item.option).length
  const uniqueSelectedEmails = new Set(resolved.map((item) => item.option?.email.toLowerCase()).filter((email): email is string => !!email))
  const duplicateSelectedEmails = Math.max(0, selected.length - unresolved - uniqueSelectedEmails.size)
  const previouslySentCount = selectedCompanies.filter((item) => item.previouslySent).length
  const departments = [...new Set(companies.map((item) => item.postalCode?.slice(0, 2)).filter((value): value is string => !!value))].sort()

  const filteredCompanies = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return companies.filter((company) => {
      if (department && !company.postalCode?.startsWith(department)) return false
      if (sendMode === 'test' && !company.options.some((item) => item.email.toLowerCase() === testRecipientEmail?.toLowerCase())) return false
      if (normalized && ![company.name, company.city ?? '', company.postalCode ?? '',
        ...company.options.flatMap((item) => [item.email, item.label])].some((value) => value.toLowerCase().includes(normalized))) return false
      if (sendMode === 'test') return true
      if (audienceFilter === 'ELIGIBLE') return !company.blockedReason && company.options.some((item) => !item.blockedReason) && !company.previouslySent
      if (audienceFilter === 'SENT') return company.previouslySent
      if (audienceFilter === 'EXCLUDED') return !!company.blockedReason
      return true
    })
  }, [companies, query, department, audienceFilter, sendMode, testRecipientEmail])

  const onTemplateChange = (value: string) => {
    setTemplateId(value)
    setPreview(null)
    const template = templates.find((item) => String(item.id) === value)
    if (template && !subject.trim()) setSubject(template.subject)
  }

  const selectVisible = () => {
    const ids = filteredCompanies.filter((item) => !item.blockedReason && optionsFor(item).length > 0 &&
      (!item.previouslySent || includePreviouslySent)).map((item) => item.id)
    setSelected((current) => [...new Set([...current, ...ids])])
  }

  const selectPilot = () => {
    const ids = filteredCompanies.filter((item) => !item.blockedReason && optionsFor(item).length > 0 &&
      (!item.previouslySent || includePreviouslySent)).slice(0, 25).map((item) => item.id)
    setSelected(ids)
  }

  const createDraft = () => startTransition(async () => {
    if (!templateId) {
      setMessage('Choisissez un modèle Brevo.')
      return
    }
    const result = await createCampaignDraftAction({ name, subject, recipients: resolved.map(({ company, option }) =>
      ({ companyId: company.id, contactId: option!.contactId })), includePreviouslySent, templateId })
    setMessage(
      result.success
        ? `Brouillon créé avec ${result.recipientCount} destinataire(s) vérifié(s).`
        : result.error ?? 'Erreur'
    )
  })

  const showPreview = () => startTransition(async () => {
    if (!templateId || selected.length === 0) {
      setMessage('Choisissez un modèle et au moins un office.')
      return
    }
    const first = resolved.find((item) => item.option)
    if (!first?.option) { setMessage('Choisissez un destinataire pour l’aperçu.'); return }
    const result = await previewCampaignEmailAction({ templateId, companyId: first.company.id, contactId: first.option.contactId })
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

  const markReply = (recipientId: string) => {
    if (!window.confirm('Confirmer une réponse réelle (hors message automatique) ? Le CRM créera une tâche de qualification, sans créer d’opportunité.')) return
    startTransition(async () => {
      const result = await markCampaignReplyAction(recipientId)
      setMessage(
        result.success
          ? ('alreadyProcessed' in result && result.alreadyProcessed
              ? 'Cette réponse était déjà enregistrée.'
              : 'Réponse enregistrée : activité et tâche de qualification mises à jour.')
          : ('error' in result ? result.error ?? 'Erreur' : 'Erreur')
      )
    })
  }

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
        Filtrez les offices, vérifiez chaque destinataire, puis créez un brouillon. Limite du pilote : 25 adresses par campagne.
      </p>

      <p className={`mt-3 rounded-lg border p-3 text-sm ${sendMode === 'disabled' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-border bg-muted'}`}>
        {sendMode === 'disabled' && 'Envoi verrouillé par configuration.'}
        {sendMode === 'test' && `Mode test : seul ${testRecipientEmail ?? 'le destinataire de test configuré'} peut recevoir un email.`}
        {sendMode === 'live' && 'Mode réel actif : les destinataires autorisés seront contactés.'}
      </p>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium">1. Destinataires</p>
        <div className="grid min-w-0 gap-2 sm:grid-cols-3">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Office, ville, email…" aria-label="Rechercher un destinataire" className="min-w-0" />
          <select value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="Département"
            className="h-10 min-w-0 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Tous les départements</option>
            {departments.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={audienceFilter} onChange={(event) => setAudienceFilter(event.target.value as typeof audienceFilter)} aria-label="État des destinataires"
            className="h-10 min-w-0 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="ELIGIBLE">Jamais contactés par campagne</option>
            <option value="SENT">Déjà contactés par campagne</option>
            <option value="EXCLUDED">Exclus / sans email</option>
            <option value="ALL">Tous les offices</option>
          </select>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{filteredCompanies.length} office(s) correspondant aux filtres · {companies.filter((item) => !!item.blockedReason).length} exclu(s) ou sans email dans la base.</p>
        {audienceFilter === 'SENT' || audienceFilter === 'ALL' ? <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includePreviouslySent} onChange={(event) => setIncludePreviouslySent(event.target.checked)} />
          Inclure explicitement les offices déjà destinataires d’une campagne
        </label> : null}
        <div className="mt-3 rounded-lg border border-border">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted px-3 py-2 text-sm">
            <span>{selected.length} office(s) sélectionné(s)</span>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="text-accent hover:underline" onClick={selectVisible}>Ajouter tous les résultats éligibles ({filteredCompanies.filter((item) => !item.blockedReason && optionsFor(item).length > 0 && (!item.previouslySent || includePreviouslySent)).length})</button>
              {sendMode !== 'test' && <button type="button" className="text-accent hover:underline" onClick={selectPilot}>Choisir les 25 premiers pour le pilote</button>}
              <button type="button" className="text-muted-foreground hover:underline" onClick={() => setSelected([])}>Vider la sélection</button>
            </div>
          </div>
          <div className="max-h-64 overflow-auto">
            {filteredCompanies.map((company) => <div key={company.id} className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-2 text-sm last:border-0">
              <input type="checkbox" aria-label={`Sélectionner ${company.name}`} checked={selected.includes(company.id)}
                disabled={!!company.blockedReason || optionsFor(company).length === 0 || (company.previouslySent && !includePreviouslySent)}
                onChange={(event) => setSelected((current) => event.target.checked
                  ? [...current, company.id] : current.filter((id) => id !== company.id))} />
              <span className="min-w-0 flex-1 basis-48"><span className="font-medium">{company.name}</span>
                <span className="text-muted-foreground"> · {company.postalCode ?? ''} {company.city ?? ''}</span>
                {company.previouslySent && <span className="ml-2 text-amber-500">Déjà contacté</span>}
              </span>
              {sendMode === 'test' ? <span className="max-w-full break-all text-xs">
                Destinataire TEST : {company.options.find((item) => item.email.toLowerCase() === testRecipientEmail?.toLowerCase())?.email ?? 'Adresse test introuvable'}
              </span> : company.options.length > 1 ? <select aria-label={`Destinataire pour ${company.name}`}
                value={chosenOption(company) ? chosenOption(company)?.contactId ?? 'office' : ''}
                onChange={(event) => setChosen((current) => ({ ...current, [company.id]: event.target.value === 'office' ? null : event.target.value }))}
                className="w-full min-w-0 rounded-md border border-input bg-background p-2 text-xs sm:w-auto sm:max-w-[26rem]">
                <option value="">Choisir un destinataire</option>
                {company.options.map((option) => <option key={option.contactId ?? 'office'} value={option.contactId ?? 'office'} disabled={!!option.blockedReason}>
                  {option.label} · {option.email}{option.blockedReason ? ` — ${option.blockedReason}` : ''}
                </option>)}
              </select> : <span className="text-xs text-muted-foreground">{company.options[0] ? `${company.options[0].label} · ${company.options[0].email}` : 'Aucune adresse'}</span>}
              {company.blockedReason && <span className="basis-full text-xs text-destructive">{company.options.find((item) => item.email.toLowerCase() === testRecipientEmail?.toLowerCase())?.blockedReason ?? company.blockedReason}</span>}
            </div>)}
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
          <Button variant="ghost" onClick={sendTest} disabled={pending || !templateId || !testRecipientEmail || sendMode === 'disabled'}>
            <MailCheck className="mr-2 h-4 w-4" />M’envoyer un test
          </Button>
        </div>
      </div>

      {preview && <div className="mt-5 overflow-hidden rounded-xl border border-border">
        <div className="border-b border-border bg-muted p-3 text-sm">
          <p className="font-medium">{subject || preview.subject}</p>
          <p className="text-xs text-muted-foreground">
            De : {preview.fromName ?? selectedTemplate?.senderName ?? '—'} &lt;{preview.fromEmail ?? selectedTemplate?.senderEmail ?? '—'}&gt;
          </p>
          {preview.subject && preview.subject !== subject && (
            <p className="mt-1 text-xs text-muted-foreground">Objet du modèle Brevo : {preview.subject}</p>
          )}
        </div>
        <iframe title="Aperçu de l’email" sandbox="" srcDoc={preview.html} className="h-[520px] w-full bg-white" />
      </div>}

      <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-sm font-medium">3. Vérification</p>
        <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
          <p>Campagne : <span className="font-medium">{name || '—'}</span></p>
          <p>Modèle : <span className="font-medium">{selectedTemplate?.name ?? '—'}</span></p>
          <p>Objet : <span className="font-medium">{subject || '—'}</span></p>
          <p>Offices sélectionnés : <span className="font-medium">{selected.length}</span></p>
          <p>Emails uniques : <span className="font-medium">{uniqueSelectedEmails.size}</span></p>
          <p>Doublons email : <span className="font-medium">{duplicateSelectedEmails}</span></p>
          <p>Destinataires à choisir : <span className="font-medium">{unresolved}</span></p>
          <p>Déjà contactés : <span className="font-medium">{previouslySentCount}</span></p>
        </div>
        {selected.length > 25 && <p className="mt-3 text-sm text-amber-500">{selected.length} offices sélectionnés : le pilote accepte 25 adresses par brouillon. Réduisez la sélection ou utilisez « Choisir les 25 premiers ».</p>}
        {unresolved > 0 && <p className="mt-2 text-sm text-amber-500">Choisissez un destinataire pour chaque office ayant plusieurs adresses.</p>}
        {duplicateSelectedEmails > 0 && <p className="mt-2 text-sm text-destructive">Une même adresse est sélectionnée pour plusieurs offices. Retirez les doublons avant de créer le brouillon.</p>}
        {previouslySentCount > 0 && !includePreviouslySent && <p className="mt-2 text-sm text-amber-500">Certains offices ont déjà reçu une campagne. Pour les inclure, cochez l’option dans la liste « Déjà contactés ».</p>}
        {resolved.length > 0 && <details className="mt-3" open>
          <summary className="cursor-pointer text-sm text-accent">Liste exacte des destinataires ({resolved.length})</summary>
          <div className="mt-2 max-h-52 overflow-auto rounded border border-border text-xs">
            {resolved.map(({ company, option }) => <div key={company.id} className="flex justify-between gap-3 border-b border-border px-3 py-2 last:border-0">
              <span>{company.name} · {option ? `${option.label} · ${option.email}` : 'Destinataire à choisir'}
                {company.previouslySent ? ' · Déjà contacté' : ''}</span>
              <button type="button" className="shrink-0 text-accent hover:underline" onClick={() => setSelected((current) => current.filter((id) => id !== company.id))}>Retirer</button>
            </div>)}
          </div>
        </details>}
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={createDraft} disabled={pending || selected.length === 0 || selected.length > 25 || unresolved > 0 || duplicateSelectedEmails > 0 || (previouslySentCount > 0 && !includePreviouslySent) || !templateId || !subject.trim()}>
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
          const delivered = related.filter((item) => ['DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'].includes(item.status)).length
          const opened = related.filter((item) => item.openCount > 0).length
          const clicked = related.filter((item) => item.clickCount > 0).length
          const bounced = (counts.HARD_BOUNCE ?? 0) + (counts.SOFT_BOUNCE ?? 0) + (counts.FAILED ?? 0)
          return <div key={campaign.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium">{campaign.name}</p>
                <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {campaign.status} · {campaign.recipientCount} destinataire(s)
                  {' · '}{delivered} délivré(s)
                  {' · '}{opened} ouvert(s)
                  {' · '}{clicked} cliqué(s)
                  {' · '}{counts.REPLIED ?? 0} réponse(s)
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
                      <th className="p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>{related.map((item) => <tr key={item.id} className="border-t border-border">
                    <td className="p-2">{item.email}</td>
                    <td className="p-2">{item.status}</td>
                    <td className="p-2">{item.openCount}</td>
                    <td className="p-2">{item.clickCount}</td>
                    <td className="p-2">{item.lastEventAt ? new Date(item.lastEventAt).toLocaleString('fr-FR') : '—'}</td>
                    <td className="p-2">
                      {['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(item.status) &&
                        <button className="text-accent hover:underline disabled:opacity-50" disabled={pending} onClick={() => markReply(item.id)}>Réponse reçue</button>}
                      {item.status === 'REPLIED' && <span className="text-muted-foreground">Traitée</span>}
                    </td>
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
