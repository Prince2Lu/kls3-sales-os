'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreateActivityModal } from '@/components/pipeline/create-activity-modal'

export function CreateContactActivityButton({
  contactId,
  opportunityId,
  coldCallTargetId,
}: {
  contactId: string
  opportunityId?: string
  coldCallTargetId?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>+ Activité</Button>
      {open && (
        <CreateActivityModal
          contactId={contactId}
          opportunityId={opportunityId}
          coldCallTargetId={coldCallTargetId}
          revalidatePaths={[`/contacts/${contactId}`]}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
