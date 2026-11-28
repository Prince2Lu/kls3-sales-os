'use client'

// Dossiers oubliés (Trello #63): engaged prospects with no open task and no
// activity for 14+ days. The follow-up is only proposed; a TASK is created
// when the user clicks "Planifier une relance".

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { BusinessLine, Company, Contact } from '@/types/domain'
import { FORGOTTEN_THRESHOLD_DAYS, proposedFollowUpAt, type ForgottenFile } from '@/lib/prospecting/forgotten-files'
import { createManualTask } from '@/lib/actions/task-actions'
import { businessLineLabel } from '@/lib/business-lines/display'

const VISIBLE = 10

interface ForgottenFilesSectionProps {
  files: ForgottenFile[]
  businessLineMap: Record<string, BusinessLine>
  companyMap: Record<string, Company>
  contactMap: Record<string, Contact>
}

export function ForgottenFilesSection({ files, businessLineMap, companyMap, contactMap }: ForgottenFilesSectionProps) {
  const [showAll, setShowAll] = useState(false)
  if (files.length === 0) return null
  const visible = showAll ? files : files.slice(0, VISIBLE)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          Dossiers oubliés ({files.length})
        </CardTitle>
        <p className="text-xs text-text-muted mt-1">
          Prospects en échange, qualifiés ou à rappeler, sans tâche prévue ni action depuis {FORGOTTEN_THRESHOLD_DAYS} jours ou plus
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {visible.map((file) => (
            <ForgottenRow
              key={file.targetId}
              file={file}
              businessLine={businessLineMap[file.businessLineId]}
              company={companyMap[file.companyId]}
              contact={file.contactId ? contactMap[file.contactId] : undefined}
            />
          ))}
        </ul>
        {files.length > VISIBLE && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="mt-3 text-sm text-text-muted hover:text-text-primary"
          >
            {showAll ? 'Réduire' : `Voir les ${files.length - VISIBLE} autres`}
          </button>
        )}
      </CardContent>
    </Card>
  )
}

function ForgottenRow({ file, businessLine, company, contact }: {
  file: ForgottenFile
  businessLine?: BusinessLine
  company?: Company
  contact?: Contact
}) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')

  async function planFollowUp() {
    setState('saving')
    const response = await createManualTask({
      coldCallTargetId: file.targetId,
      contactId: file.contactId ?? undefined,
      type: 'CALL',
      dueAt: proposedFollowUpAt(),
      priority: 'MEDIUM',
      notes: `Relance d'un dossier sans action depuis ${file.idleDays} jours`,
    })
    if (response.success) {
      setState('done')
      router.refresh()
    } else {
      setState('error')
    }
  }

  const contactName = contact ? [contact.firstName, contact.lastName].filter(Boolean).join(' ') : ''

  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-border bg-card-bg p-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/companies/${file.companyId}`} className="font-medium text-sm hover:text-accent">
            {company?.name || 'Entreprise inconnue'}
          </Link>
          <Badge variant="default" className="text-xs">{file.status}</Badge>
          {businessLine && <Badge variant="muted" className="text-xs">{businessLineLabel(businessLine)}</Badge>}
        </div>
        <p className="text-xs text-text-muted">
          {contactName ? `${contactName} · ` : ''}sans action depuis {file.idleDays} jours
        </p>
        {state === 'error' && <p className="text-xs text-red-400" role="alert">La relance n&apos;a pas pu être créée. Réessayez.</p>}
      </div>
      <button
        type="button"
        onClick={planFollowUp}
        disabled={state === 'saving' || state === 'done'}
        className="self-start sm:self-center rounded-full border border-white/15 px-4 py-1.5 text-sm hover:border-accent disabled:opacity-50"
      >
        {state === 'saving' ? 'Création…' : state === 'done' ? 'Relance prévue demain' : 'Planifier une relance demain'}
      </button>
    </li>
  )
}
