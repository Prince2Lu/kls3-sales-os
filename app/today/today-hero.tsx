// Today page compact header (Phase 4)

interface TodayHeroProps {
  userName: string
  todayDate: string
  overdueCount: number
  todayTasksCount: number
  meetingsCount: number
  noNextActionCount: number
}

export function TodayHero({
  userName,
  todayDate,
  overdueCount,
  todayTasksCount,
  meetingsCount,
  noNextActionCount,
}: TodayHeroProps) {
  return (
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
  )
}
