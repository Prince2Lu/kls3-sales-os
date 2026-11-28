'use client'

// Manual check of replies to direct emails (Trello #65). The daily cron does the
// same thing every morning; this button is for "has the prospect answered yet?".

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { checkMyEmailRepliesAction } from './actions'

export function EmailRepliesCheck() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function check() {
    setMessage(null)
    startTransition(async () => {
      const result = await checkMyEmailRepliesAction()
      if (!result.success) {
        setMessage(result.error)
        return
      }
      if (!result.checked) setMessage('Aucun email direct envoyé ces 30 derniers jours.')
      else if (result.logged > 0) {
        setMessage(`${result.logged} nouvelle${result.logged > 1 ? 's' : ''} réponse${result.logged > 1 ? 's' : ''} : tâche${result.logged > 1 ? 's' : ''} de relance urgente${result.logged > 1 ? 's' : ''} créée${result.logged > 1 ? 's' : ''}.`)
        router.refresh()
      } else setMessage(result.found > 0 ? 'Réponses déjà enregistrées, rien de nouveau.' : 'Pas de nouvelle réponse.')
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={check}
        disabled={pending}
        className="rounded-full border-[0.5px] border-white/15 px-4 py-1.5 text-sm text-text-primary hover:border-accent disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {pending ? 'Vérification…' : 'Vérifier mes réponses email'}
      </button>
      {message && <p role="status" className="text-xs text-text-muted">{message}</p>}
    </div>
  )
}
