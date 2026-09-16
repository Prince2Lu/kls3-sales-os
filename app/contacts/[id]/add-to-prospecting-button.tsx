'use client'

// Add to Prospecting button for Contact detail page
// Client component to manage modal state

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AddToProspectingModal } from '@/components/prospecting/add-to-prospecting-modal'
import type { BusinessLine, Contact, Owner } from '@/types/domain'

interface AddToProspectingButtonProps {
  companyId: string
  companyName: string
  contact: Contact
  businessLines: BusinessLine[]
  currentOwner: Owner
}

export function AddToProspectingButton({
  companyId,
  companyName,
  contact,
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
          contacts={[contact]} // Only this contact
          businessLines={businessLines}
          preSelectedContactId={contact.id} // Auto-select this contact
          currentOwner={currentOwner}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}
