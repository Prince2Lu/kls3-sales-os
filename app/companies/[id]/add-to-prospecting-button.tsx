'use client'

// Add to Prospecting button for Company detail page
// Client component to manage modal state

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AddToProspectingModal } from '@/components/prospecting/add-to-prospecting-modal'
import type { BusinessLine, Contact, Owner } from '@/types/domain'

interface AddToProspectingButtonProps {
  companyId: string
  companyName: string
  contacts: Contact[]
  businessLines: BusinessLine[]
  currentOwner: Owner
}

export function AddToProspectingButton({
  companyId,
  companyName,
  contacts,
  businessLines,
  currentOwner,
}: AddToProspectingButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button variant="ghost" onClick={() => setIsModalOpen(true)}>
        Ajouter à la prospection
      </Button>

      {isModalOpen && (
        <AddToProspectingModal
          companyId={companyId}
          companyName={companyName}
          contacts={contacts}
          businessLines={businessLines}
          currentOwner={currentOwner}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}
