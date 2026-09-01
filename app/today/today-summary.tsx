// Today summary counts (Phase 4)

interface TodaySummaryProps {
  overdueCount: number
  todayTasksCount: number
  meetingsCount: number
  noNextActionCount: number
}

export function TodaySummary({
  overdueCount,
  todayTasksCount,
  meetingsCount,
  noNextActionCount,
}: TodaySummaryProps) {
  return (
    <div className="flex gap-6 text-sm flex-wrap">
      {overdueCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-red-500 font-medium">{overdueCount} en retard</span>
        </div>
      )}

      {todayTasksCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span className="text-text-primary font-medium">
            {todayTasksCount} à faire aujourd'hui
          </span>
        </div>
      )}

      {meetingsCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span className="text-text-primary font-medium">{meetingsCount} RDV</span>
        </div>
      )}

      {noNextActionCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-yellow-500 font-medium">
            {noNextActionCount} sans prochaine action
          </span>
        </div>
      )}
    </div>
  )
}
