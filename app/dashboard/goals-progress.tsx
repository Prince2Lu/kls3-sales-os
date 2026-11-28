// Objectifs vs Réalisé per Business Line (Trello #61)
// Goals come from the Airtable GOALS table; actuals follow the Dashboard rules
// (Activities for activity, confirmed/paid Value Events for value).

import type { BusinessLine, Goal } from '@/types/domain'
import type { DateRange } from '@/lib/utils/period'
import { buildGoalProgress, type GoalData, type GoalProgress } from '@/lib/goals/goal-progress'

interface GoalsProgressProps {
  goals: Goal[]
  goalsError: boolean
  businessLines: BusinessLine[]
  selectedBusinessLineId: string | null
  period: DateRange
  data: GoalData
}

function formatValue(value: number, unit: 'count' | 'currency'): string {
  const text = value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
  return unit === 'currency' ? `${text} €` : text
}

function formatWindow(window: DateRange): string {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${window.start.toLocaleDateString('fr-FR', options)} – ${window.end.toLocaleDateString('fr-FR', options)}`
}

function ProgressRow({ row }: { row: Extract<GoalProgress, { status: 'measured' }> }) {
  const reached = row.actual >= row.target && row.target > 0
  const behind = row.expectedByNow !== null && row.actual < row.expectedByNow
  const width = Math.min(row.percent, 100)

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm">{row.label}</span>
        <span className="text-sm font-medium">
          {formatValue(row.actual, row.unit)} / {formatValue(row.target, row.unit)}
          <span className="ml-2 text-text-muted">{row.percent} %</span>
        </span>
      </div>
      <div
        className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={width}
        aria-label={`${row.label} : ${row.percent} % de l'objectif`}
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${width}%` }} />
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-text-muted">
        <span>{formatWindow(row.window)}</span>
        {row.ambitiousTarget !== null && (
          <span>Ambitieux : {formatValue(row.ambitiousTarget, row.unit)}</span>
        )}
        {reached ? (
          <span className="text-text-primary">Objectif atteint</span>
        ) : row.expectedByNow !== null ? (
          <span className={behind ? 'text-text-primary' : undefined}>
            {behind ? 'En retard' : 'Dans le rythme'} · attendu à date : {formatValue(row.expectedByNow, row.unit)}
          </span>
        ) : (
          <span>Période terminée</span>
        )}
      </div>
    </li>
  )
}

export function GoalsProgress({
  goals,
  goalsError,
  businessLines,
  selectedBusinessLineId,
  period,
  data,
}: GoalsProgressProps) {
  const header = (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px w-7 bg-accent" />
      <h2 className="text-xs uppercase tracking-wide text-accent font-medium">Objectifs vs Réalisé</h2>
    </div>
  )

  if (goalsError) {
    return (
      <section>
        {header}
        <p className="text-sm text-text-muted">Les objectifs sont momentanément indisponibles. Réessayez dans quelques minutes.</p>
      </section>
    )
  }

  const scopedGoals = selectedBusinessLineId
    ? goals.filter((goal) => goal.businessLineId === selectedBusinessLineId)
    : goals
  const rows = buildGoalProgress(scopedGoals, period, data)
  const visibleLines = businessLines.filter((line) => rows.some((row) => row.goal.businessLineId === line.id))

  if (rows.length === 0) {
    return (
      <section>
        {header}
        <p className="text-sm text-text-muted">
          Aucun objectif actif sur cette période. Les objectifs se configurent dans la table GOALS d&apos;Airtable.
        </p>
      </section>
    )
  }

  return (
    <section>
      {header}
      <div className="grid gap-px overflow-hidden rounded-[20px] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
        {visibleLines.map((line) => (
          <div key={line.id} className="bg-card-bg p-5">
            <h3 className="font-syne font-semibold">{line.name}</h3>
            <ul className="divide-y divide-border">
              {rows
                .filter((row) => row.goal.businessLineId === line.id)
                .map((row) =>
                  row.status === 'measured' ? (
                    <ProgressRow key={row.goal.id} row={row} />
                  ) : (
                    <li key={row.goal.id} className="py-3 text-sm text-text-muted">
                      {row.label} · {row.status === 'unknown_metric' ? 'métrique non reconnue' : 'période non reconnue'}
                    </li>
                  )
                )}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
