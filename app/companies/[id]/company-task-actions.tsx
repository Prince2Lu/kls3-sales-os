'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { completeTaskAction } from '@/app/prospects/actions'

export function CompanyTaskActions({
  taskId,
  companyId,
}: {
  taskId: string
  companyId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleComplete() {
    startTransition(async () => {
      const result = await completeTaskAction(taskId)
      if (!result.success) {
        alert(result.error || 'Erreur lors de la clôture de la tâche')
        return
      }
      router.refresh()
    })
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleComplete}
      disabled={isPending}
      className="text-xs h-7 px-2"
    >
      {isPending ? 'Fermeture...' : 'Marquer terminé'}
    </Button>
  )
}
