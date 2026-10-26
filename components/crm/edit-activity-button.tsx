'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreateActivityModal } from '@/components/pipeline/create-activity-modal'
import type { Activity } from '@/types/domain'

export function EditActivityButton({ activity }: { activity: Activity }) {
  const [open, setOpen] = useState(false)
  return <>
    <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Modifier l’activité</Button>
    {open && <CreateActivityModal activity={activity} onClose={() => setOpen(false)} />}
  </>
}
