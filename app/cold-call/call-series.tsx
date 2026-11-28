'use client'

// Prospection "en série" (Trello #59): one prospect at a time from the
// "À appeler maintenant" queue. Call → Résultat → Prochaine action → Prospect suivant.
// Results go through recordCallActivity, the same action as the board, so the
// Opportunity conversion rules are the same everywhere.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Activity, ActivityResult, ActivityType, BusinessLine, ColdCallTarget, Company, Contact, Task } from '@/types/domain'
import type { CallQueueItem } from '@/lib/prospecting/call-queue'
import {
  FOLLOW_UP_CHOICES,
  followUpDueAt,
  followUpTaskType,
  needsFollowUp,
  summarizeSeries,
  type FollowUpChoice,
} from '@/lib/prospecting/call-series'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ContactInfo } from '@/components/pipeline/contact-info'
import { createManualTask } from '@/lib/actions/task-actions'
import { recordCallActivity } from './actions'
import { buildCallBriefing } from '@/lib/prospecting/call-briefing'
import { businessLineLabel } from '@/lib/business-lines/display'

const RESULTS: Array<{ value: ActivityResult; label: string; primary?: boolean }> = [
  { value: 'NO_ANSWER', label: 'Pas de réponse', primary: true },
  { value: 'CONVERSATION', label: 'Conversation', primary: true },
  { value: 'MEETING_BOOKED', label: 'RDV pris', primary: true },
  { value: 'NOT_INTERESTED', label: 'Pas intéressé', primary: true },
  { value: 'VOICEMAIL', label: 'Message vocal' },
  { value: 'CALLBACK', label: 'À rappeler' },
  { value: 'EMAIL_REQUESTED', label: 'Email demandé' },
  { value: 'WRONG_NUMBER', label: 'Mauvais numéro' },
]

const RESULT_LABELS = {
  ...Object.fromEntries(RESULTS.map((item) => [item.value, item.label])),
  EMAIL_SENT: 'Email envoyé',
  EMAIL_REPLY: 'Réponse email',
  LINKEDIN_SENT: 'Message LinkedIn',
  LINKEDIN_REPLY: 'Réponse LinkedIn',
} as Record<ActivityResult, string>

const TYPE_LABELS: Partial<Record<ActivityType, string>> = {
  CALL: 'Appel',
  EMAIL: 'Email',
  LINKEDIN: 'LinkedIn',
  MEETING: 'RDV',
  DEMO: 'Démo',
  PROPOSAL: 'Proposition',
  NOTE: 'Note',
}

function activityLabel(activity: Activity) {
  const type = TYPE_LABELS[activity.type] ?? activity.type
  const result = activity.result ? RESULT_LABELS[activity.result] ?? activity.result : ''
  return result ? `${type} · ${result}` : type
}

interface CallSeriesProps {
  items: CallQueueItem[]
  targetsById: Record<string, ColdCallTarget>
  companiesMap: Record<string, Company>
  contactsMap: Record<string, Contact>
  blMap: Record<string, BusinessLine>
  activitiesByTargetId: Record<string, Activity[]>
  /** All activities and TODO tasks, for the briefing (Trello #64). */
  activities: Activity[]
  tasks: Task[]
  onExit: () => void
}

type Step = { kind: 'call' } | { kind: 'follow-up'; result: ActivityResult } | { kind: 'done' }

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function CallSeries({ items, targetsById, companiesMap, contactsMap, blMap, activitiesByTargetId, activities, tasks, onExit }: CallSeriesProps) {
  const router = useRouter()
  // Frozen at start: refreshing data after each call must not reorder the series.
  const [queue] = useState(() => items.map((item) => item))
  const [startedAt] = useState(() => new Date())
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState<Step>(queue.length === 0 ? { kind: 'done' } : { kind: 'call' })
  const [outcomes, setOutcomes] = useState<Array<ActivityResult | 'SKIPPED'>>([])
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const item = queue[index]
  const target = item ? targetsById[item.targetId] : undefined
  const company = target ? companiesMap[target.companyId] : undefined
  const contact = target?.contactId ? contactsMap[target.contactId] ?? null : null
  const briefing = useMemo(() => {
    if (!target) return null
    return buildCallBriefing({ targetId: target.id, contactId: target.contactId, activities, tasks })
  }, [activities, tasks, target])

  function advance() {
    setNotes('')
    setError(null)
    if (index + 1 >= queue.length) {
      setStep({ kind: 'done' })
      router.refresh()
    } else {
      setIndex(index + 1)
      setStep({ kind: 'call' })
    }
  }

  async function handleResult(result: ActivityResult) {
    if (!target || busy) return
    setBusy(true)
    setError(null)
    const response = await recordCallActivity(target.id, result, { notes: notes.trim() || undefined })
    setBusy(false)
    if (!response.success) {
      setError("L'appel n'a pas pu être enregistré. Réessayez.")
      return
    }
    setOutcomes((previous) => [...previous, result])
    if (needsFollowUp(result)) setStep({ kind: 'follow-up', result })
    else advance()
  }

  async function handleFollowUp(choice: FollowUpChoice | null, result: ActivityResult) {
    if (!target || busy) return
    if (choice) {
      setBusy(true)
      setError(null)
      const response = await createManualTask({
        coldCallTargetId: target.id,
        contactId: target.contactId ?? undefined,
        type: followUpTaskType(result),
        dueAt: followUpDueAt(choice),
        priority: 'MEDIUM',
        notes: `Relance après appel : ${RESULT_LABELS[result] ?? result}`,
      })
      setBusy(false)
      if (!response.success) {
        setError("La relance n'a pas pu être créée. Réessayez ou passez sans relance.")
        return
      }
    }
    advance()
  }

  function skip() {
    setOutcomes((previous) => [...previous, 'SKIPPED'])
    advance()
  }

  if (step.kind === 'done') {
    const summary = summarizeSeries(outcomes, startedAt)
    const stats = [
      { label: 'Appels', value: summary.calls },
      { label: 'Conversations', value: summary.conversations },
      { label: 'RDV', value: summary.meetings },
      { label: 'Durée', value: `${summary.minutes} min` },
    ]
    return (
      <Card className="space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-bold font-syne">Série terminée</h2>
          <p className="text-sm text-text-muted mt-1">
            {queue.length === 0 ? 'Personne à appeler maintenant.' : `${summary.skipped} prospect${summary.skipped > 1 ? 's' : ''} passé${summary.skipped > 1 ? 's' : ''} sans appel.`}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-[20px] bg-white/[0.06]">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card-bg p-4">
              <div className="text-2xl font-syne font-bold">{stat.value}</div>
              <div className="text-xs text-text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
        <Button onClick={onExit}>Retour à la liste</Button>
      </Card>
    )
  }

  if (!item || !target) {
    // Target disappeared since the series started (archived elsewhere): move on.
    return (
      <Card className="p-6 space-y-4">
        <p className="text-sm text-text-muted">Ce prospect n&apos;est plus en prospection active.</p>
        <Button onClick={skip}>Prospect suivant</Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-text-muted" aria-live="polite">
          {index + 1} / {queue.length} appels
        </p>
        <button type="button" onClick={() => setStep({ kind: 'done' })} className="text-sm text-text-muted hover:text-text-primary">
          Terminer la série
        </button>
      </div>
      <div className="h-px w-full bg-white/[0.06]">
        <div className="h-px bg-accent" style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>

      <Card className="p-6 space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent" className="text-xs">{item.label}</Badge>
            <span className="text-xs text-text-muted">{item.reason}</span>
          </div>
          <div className="text-xs uppercase tracking-wide text-text-muted">
            {businessLineLabel(blMap[target.businessLineId])} · {target.callStatus}
          </div>
          <Link href={`/companies/${target.companyId}`} className="block text-2xl font-syne font-bold hover:text-accent">
            {company?.name || 'Entreprise inconnue'}
          </Link>
          {contact?.jobTitle && <p className="text-sm text-text-muted">{contact.jobTitle}</p>}
          <ContactInfo contact={contact} company={company} />
          {briefing && <CallBriefingPanel briefing={briefing} />}
        </div>

        {step.kind === 'call' ? (
          <div className="space-y-3">
            <label htmlFor="series-notes" className="text-xs font-medium text-text-muted">Notes / compte rendu</label>
            <textarea
              id="series-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Points clés, besoin, objection…"
              className="w-full resize-y rounded-lg border border-border bg-card-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="grid grid-cols-2 gap-2">
              {RESULTS.filter((result) => result.primary).map((result) => (
                <Button key={result.value} onClick={() => handleResult(result.value)} disabled={busy}>
                  {result.label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RESULTS.filter((result) => !result.primary).map((result) => (
                <Button key={result.value} variant="ghost" onClick={() => handleResult(result.value)} disabled={busy}>
                  {result.label}
                </Button>
              ))}
            </div>
            <button type="button" onClick={skip} disabled={busy} className="text-sm text-text-muted hover:text-text-primary">
              Passer sans appeler
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              {RESULT_LABELS[step.result]} enregistré. Prochaine relance ?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FOLLOW_UP_CHOICES.map((choice) => (
                <Button key={choice.value} onClick={() => handleFollowUp(choice.value, step.result)} disabled={busy}>
                  {choice.label}
                </Button>
              ))}
              <Button variant="ghost" onClick={() => handleFollowUp(null, step.result)} disabled={busy}>
                Sans relance
              </Button>
            </div>
          </div>
        )}

        {busy && <p className="text-xs text-text-muted" aria-live="polite">Enregistrement…</p>}
        {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
      </Card>
    </div>
  )
}

function CallBriefingPanel({ briefing }: { briefing: NonNullable<ReturnType<typeof buildCallBriefing>> }) {
  const touches = [
    briefing.calls ? `${briefing.calls} appel${briefing.calls > 1 ? 's' : ''}` : null,
    briefing.emails ? `${briefing.emails} email${briefing.emails > 1 ? 's' : ''}` : null,
    briefing.linkedin ? `${briefing.linkedin} LinkedIn` : null,
  ].filter(Boolean)

  if (touches.length === 0 && !briefing.openTask) {
    return <p className="text-xs text-text-muted">Premier contact : aucun historique.</p>
  }

  return (
    <section aria-label="Briefing avant appel" className="rounded-2xl border border-border p-4 space-y-2 text-sm">
      <div className="flex items-center gap-3">
        <div className="h-px w-7 bg-accent" />
        <h3 className="text-xs uppercase tracking-wide text-accent font-medium">Avant d&apos;appeler</h3>
      </div>
      {touches.length > 0 && <p className="text-text-muted">Historique : {touches.join(' · ')}</p>}
      {briefing.lastExchange && (
        <p>
          <span className="text-text-muted">Dernier échange : </span>
          {formatDateTime(briefing.lastExchange.date)} · {activityLabel(briefing.lastExchange)}
        </p>
      )}
      {briefing.lastNote?.notes && (
        <p className="whitespace-pre-line">
          <span className="text-text-muted">Dernière note ({formatDateTime(briefing.lastNote.date)}) : </span>
          {briefing.lastNote.notes}
        </p>
      )}
      {briefing.openTask && (
        <p>
          <span className="text-text-muted">Prochaine action prévue : </span>
          {briefing.openTask.notes || briefing.openTask.type}
          {briefing.openTask.dueAt ? ` · ${formatDateTime(briefing.openTask.dueAt)}` : ''}
        </p>
      )}
      {briefing.recent.length > 0 && (
        <ul className="text-xs text-text-muted space-y-0.5">
          {briefing.recent.map((activity) => (
            <li key={activity.id}>{formatDateTime(activity.date)} · {activityLabel(activity)}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
