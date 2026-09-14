'use client'

// Cold Call Kanban Column

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ColdCallTarget, Company, Contact, BusinessLine, ActivityResult, Owner } from '@/types/domain'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CallResultMenu } from './call-result-menu'
import { CallbackModal } from './callback-modal'
import { recordCallActivity } from './actions'

interface ColdCallColumnProps {
  id: string
  title: string
  targets: ColdCallTarget[]
  companiesMap: Record<string, Company>
  contactsMap: Record<string, Contact>
  blMap: Record<string, BusinessLine>
  isStageColumn?: boolean
  currentOwner: Owner
}

export function ColdCallColumn({
  id,
  title,
  targets,
  companiesMap,
  contactsMap,
  blMap,
  isStageColumn = false,
  currentOwner,
}: ColdCallColumnProps) {
  const { setNodeRef } = useDroppable({ id })

  return (
    <div className="flex-shrink-0 w-80">
      <div className="space-y-3">
        {/* Column Header */}
        <div className="flex items-center justify-between px-3">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="text-xs text-text-muted bg-card-bg px-2 py-1 rounded-full">
            {targets.length}
          </span>
        </div>

        {/* Droppable Area */}
        <SortableContext
          id={id}
          items={targets.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={setNodeRef}
            className="space-y-2 min-h-[200px] bg-background/30 rounded-lg p-2 border border-border/50"
          >
            {targets.length === 0 && (
              <div className="text-center text-text-muted text-xs py-8">Vide</div>
            )}
            {targets.map((target) => (
              <TargetCard
                key={target.id}
                target={target}
                company={companiesMap[target.companyId]}
                contact={target.contactId ? contactsMap[target.contactId] : null}
                businessLine={blMap[target.businessLineId]}
                currentOwner={currentOwner}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

interface TargetCardProps {
  target: ColdCallTarget
  company?: Company
  contact?: Contact | null
  businessLine?: BusinessLine
  currentOwner: Owner
}

function TargetCard({ target, company, contact, businessLine, currentOwner }: TargetCardProps) {
  const router = useRouter()
  const [showCallMenu, setShowCallMenu] = useState(false)
  const [showCallbackModal, setShowCallbackModal] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: target.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Phone number priority: Contact.phone > Company.phone > null
  const phoneNumber = contact?.phone || company?.phone || null

  async function handleCallResult(result: ActivityResult) {
    setShowCallMenu(false)

    // CALLBACK requires date
    if (result === 'CALLBACK') {
      setShowCallbackModal(true)
      return
    }

    // Other results: record directly
    setIsRecording(true)
    const response = await recordCallActivity(target.id, result, currentOwner)
    setIsRecording(false)

    if (response.success) {
      router.refresh()
    } else {
      alert('Erreur lors de l\'enregistrement')
    }
  }

  async function handleCallbackConfirm(callbackDate: string) {
    setShowCallbackModal(false)
    setIsRecording(true)

    const response = await recordCallActivity(target.id, 'CALLBACK', currentOwner, {
      callbackDate,
    })

    setIsRecording(false)

    if (response.success) {
      router.refresh()
    } else {
      alert('Erreur lors de l\'enregistrement')
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card className="space-y-2">
        {/* Company Name */}
        <div>
          <h4 className="font-medium text-sm line-clamp-1">
            {company?.name || 'Entreprise inconnue'}
          </h4>
        </div>

        {/* Contact Info */}
        {contact && (
          <div className="text-xs text-text-muted space-y-0.5">
            <div>
              {contact.firstName} {contact.lastName}
            </div>
            {contact.jobTitle && <div className="italic">{contact.jobTitle}</div>}
          </div>
        )}

        {/* Phone Number - Always visible */}
        <div className="text-xs">
          {phoneNumber ? (
            <a
              href={`tel:${phoneNumber}`}
              className="font-mono text-accent hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {phoneNumber}
            </a>
          ) : (
            <span className="text-text-muted italic">Aucun numéro</span>
          )}
        </div>

        {/* City */}
        {company?.city && (
          <div className="text-xs text-text-muted">{company.city}</div>
        )}

        {/* Business Line Badge */}
        {businessLine && (
          <div>
            <Badge variant="accent" className="text-xs">
              {businessLine.code === 'SACHA' ? 'Leverio' : businessLine.name}
            </Badge>
          </div>
        )}

        {/* Owner + Actions */}
        <div className="text-xs text-text-muted flex items-center justify-between gap-2">
          <span>{target.owner}</span>
          <div className="flex items-center gap-1">
            {/* Call button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowCallMenu(true)
              }}
              className="text-accent hover:text-accent/80 text-lg"
              title="Enregistrer un appel"
              disabled={isRecording}
            >
              📞
            </button>
            {target.opportunityId && (
              <Link
                href={`/prospects/${target.opportunityId}`}
                className="text-accent hover:underline text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                Opp →
              </Link>
            )}
          </div>
        </div>
      </Card>

      {/* Call Result Menu */}
      {showCallMenu && (
        <CallResultMenu
          onSelect={handleCallResult}
          onCancel={() => setShowCallMenu(false)}
        />
      )}

      {/* Callback Modal */}
      {showCallbackModal && (
        <CallbackModal
          onConfirm={handleCallbackConfirm}
          onCancel={() => setShowCallbackModal(false)}
        />
      )}
    </div>
  )
}
