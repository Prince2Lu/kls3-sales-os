'use client'

// Session completion screen (Phase 5 + Phase 6C-B)

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { BusinessLineCode } from '@/lib/utils/business-line-filter'
import { buildUrlWithBusinessLine } from '@/lib/utils/business-line-filter'
import type { SessionStats } from './focus-session'

interface SessionCompleteProps {
  stats: SessionStats
  businessLineCode: BusinessLineCode | null
}

export function SessionComplete({ stats, businessLineCode }: SessionCompleteProps) {
  // Calculate session duration
  const duration = Math.floor((new Date().getTime() - stats.startTime.getTime()) / 1000 / 60)

  // Build return URL with Business Line context preserved
  const returnUrl = buildUrlWithBusinessLine('/today', businessLineCode)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold font-syne">Session terminée</h1>
        <p className="text-text-muted">
          Excellent travail ! Voici un résumé de votre session.
        </p>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-accent">
              {stats.actionsProcessed}
            </div>
            <div className="text-sm text-text-muted mt-1">Actions traitées</div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-accent">
              {stats.conversations}
            </div>
            <div className="text-sm text-text-muted mt-1">Conversations</div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-accent">
              {stats.meetingsBooked}
            </div>
            <div className="text-sm text-text-muted mt-1">RDV pris</div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-text-muted">
              {stats.noAnswers}
            </div>
            <div className="text-sm text-text-muted mt-1">Sans réponse</div>
          </div>
        </div>

        {duration > 0 && (
          <div className="mt-6 pt-6 border-t border-border text-center">
            <div className="text-text-muted text-sm">
              Durée de session : <span className="font-medium">{duration} min</span>
            </div>
          </div>
        )}
      </Card>

      <div className="text-center">
        <Link href={returnUrl}>
          <Button size="lg">RETOUR À MA JOURNÉE</Button>
        </Link>
      </div>
    </div>
  )
}
