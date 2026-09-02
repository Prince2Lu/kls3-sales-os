// Today page compact header (Phase 4/5 + Phase 6C-B)

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { BusinessLine } from '@/types/domain'
import type { BusinessLineCode } from '@/lib/utils/business-line-filter'
import { buildUrlWithBusinessLine } from '@/lib/utils/business-line-filter'

interface TodayHeroProps {
  userName: string
  todayDate: string
  overdueCount: number
  todayTasksCount: number
  meetingsCount: number
  noNextActionCount: number
  focusableCount: number
  businessLines: BusinessLine[]
  selectedBusinessLineCode: BusinessLineCode | null
}

export function TodayHero({
  userName,
  todayDate,
  overdueCount,
  todayTasksCount,
  meetingsCount,
  noNextActionCount,
  focusableCount,
  businessLines,
  selectedBusinessLineCode,
}: TodayHeroProps) {
  // Build Focus URL with Business Line context
  const focusUrl = buildUrlWithBusinessLine('/focus', selectedBusinessLineCode)

  return (
    <div className="space-y-6">
      {/* Business Line Selector */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-px w-7 bg-accent" />
          <h2 className="text-xs uppercase tracking-wide text-accent font-medium">
            Business Line
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/today"
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              selectedBusinessLineCode === null
                ? 'bg-accent text-white border-accent'
                : 'bg-transparent text-text-primary border-border hover:bg-[rgba(255,255,255,0.05)]'
            }`}
          >
            Toutes
          </Link>
          {businessLines.map((bl) => (
            <Link
              key={bl.id}
              href={`/today?businessLine=${bl.code}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                selectedBusinessLineCode === bl.code
                  ? 'bg-accent text-white border-accent'
                  : 'bg-transparent text-text-primary border-border hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              {bl.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Today Summary */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-2xl font-bold font-syne">Bonjour {userName}</h1>
        <span className="text-text-muted">—</span>
        <span className="text-text-muted">{todayDate}</span>

        {(overdueCount > 0 || todayTasksCount > 0 || meetingsCount > 0 || noNextActionCount > 0) && (
          <>
            <span className="text-text-muted">•</span>
            <div className="flex items-center gap-3 text-sm flex-wrap">
              {overdueCount > 0 && (
                <span className="text-red-500 font-medium">{overdueCount} en retard</span>
              )}
              {todayTasksCount > 0 && (
                <>
                  {overdueCount > 0 && <span className="text-text-muted">•</span>}
                  <span className="text-text-primary font-medium">
                    {todayTasksCount} à faire
                  </span>
                </>
              )}
              {meetingsCount > 0 && (
                <>
                  {(overdueCount > 0 || todayTasksCount > 0) && <span className="text-text-muted">•</span>}
                  <span className="text-text-primary font-medium">{meetingsCount} RDV</span>
                </>
              )}
              {noNextActionCount > 0 && (
                <>
                  {(overdueCount > 0 || todayTasksCount > 0 || meetingsCount > 0) && <span className="text-text-muted">•</span>}
                  <span className="text-yellow-500 font-medium">
                    {noNextActionCount} sans action
                  </span>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Focus CTA */}
      {focusableCount > 0 ? (
        <div>
          <Link href={focusUrl}>
            <Button size="lg" className="font-semibold">
              ▶ DÉMARRER MA SESSION — {focusableCount} {focusableCount === 1 ? 'ACTION' : 'ACTIONS'}
            </Button>
          </Link>
        </div>
      ) : (
        <div>
          <Button size="lg" disabled className="font-semibold">
            Aucune action Focus disponible
          </Button>
        </div>
      )}
    </div>
  )
}
