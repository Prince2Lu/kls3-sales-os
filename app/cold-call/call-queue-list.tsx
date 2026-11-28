'use client'

// "À appeler maintenant": prospects in call order, each with its reason (Trello #57).

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ActivityResult, BusinessLine, ColdCallTarget, Company, Contact } from '@/types/domain'
import type { CallQueueItem } from '@/lib/prospecting/call-queue'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ContactInfo } from '@/components/pipeline/contact-info'
import { CallResultMenu } from './call-result-menu'
import { recordCallActivity } from './actions'
import { businessLineLabel } from '@/lib/business-lines/display'

interface CallQueueListProps {
  items: CallQueueItem[]
  targetsById: Record<string, ColdCallTarget>
  companiesMap: Record<string, Company>
  contactsMap: Record<string, Contact>
  blMap: Record<string, BusinessLine>
}

export function CallQueueList({ items, targetsById, companiesMap, contactsMap, blMap }: CallQueueListProps) {
  if (items.length === 0) {
    return (
      <Card className="text-center text-sm text-text-muted py-10">
        Personne à appeler maintenant. Les prochaines relances datées apparaîtront ici le jour prévu.
      </Card>
    )
  }

  return (
    <ol className="space-y-2" aria-label="Prospects à appeler, dans l'ordre">
      {items.map((item, index) => {
        const target = targetsById[item.targetId]
        if (!target) return null
        return (
          <CallQueueRow
            key={item.targetId}
            position={index + 1}
            item={item}
            target={target}
            company={companiesMap[target.companyId]}
            contact={target.contactId ? contactsMap[target.contactId] : null}
            businessLine={blMap[target.businessLineId]}
          />
        )
      })}
    </ol>
  )
}

function CallQueueRow({ position, item, target, company, contact, businessLine }: {
  position: number
  item: CallQueueItem
  target: ColdCallTarget
  company?: Company
  contact: Contact | null
  businessLine?: BusinessLine
}) {
  const router = useRouter()
  const [showCallMenu, setShowCallMenu] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCallResult(result: ActivityResult, notes?: string) {
    setShowCallMenu(false)
    setIsRecording(true)
    setError(null)
    const response = await recordCallActivity(target.id, result, { notes })
    setIsRecording(false)
    if (response.success) router.refresh()
    else setError("L'appel n'a pas pu être enregistré. Réessayez.")
  }

  const urgent = item.rule === 'OVERDUE_TASK' || item.rule === 'TASK_TODAY'

  return (
    <li>
      <Card className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="text-xs text-text-muted w-6 shrink-0 pt-0.5 text-right">{position}</span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={urgent ? 'accent' : 'default'} className="text-xs">{item.label}</Badge>
              <span className="text-xs text-text-muted">{item.reason}</span>
            </div>
            <Link href={`/companies/${target.companyId}`} className="font-medium text-sm hover:text-accent line-clamp-1">
              {company?.name || 'Entreprise inconnue'}
            </Link>
            <ContactInfo contact={contact} company={company} compact />
            <div className="text-xs text-text-muted">
              {businessLineLabel(businessLine)} · {target.callStatus} · {target.owner}
            </div>
            {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCallMenu(true)}
          disabled={isRecording}
          className="self-stretch sm:self-center rounded-full bg-accent text-white text-sm px-4 py-2 disabled:opacity-50"
        >
          {isRecording ? 'Enregistrement…' : "Résultat d'appel"}
        </button>
      </Card>
      {showCallMenu && <CallResultMenu onSelect={handleCallResult} onCancel={() => setShowCallMenu(false)} />}
    </li>
  )
}
