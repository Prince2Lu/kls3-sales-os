// Ma journée page (Phase 6C-B)
// Operational daily workspace with Business Line filtering

import { getTasks, getOpportunities, getBusinessLines } from '@/lib/airtable'
import { getCurrentUser, getCurrentUserDisplayName } from '@/lib/utils/current-user'
import { isOverdue, isToday, formatFrenchDate } from '@/lib/utils/date'
import { parseBusinessLineParam, filterOpportunitiesByBusinessLine, filterTasksByBusinessLine } from '@/lib/utils/business-line-filter'
import { filterFocusEligible } from '@/lib/utils/focus-eligibility'
import { TodayHero } from './today-hero'
import { OverdueSection } from './overdue-section'
import { TodayTasksSection } from './today-tasks-section'
import { TodayMeetingsSection } from './today-meetings-section'
import { NoNextActionSection } from './no-next-action-section'

export default async function TodayPage(props: {
  searchParams: Promise<{ businessLine?: string }>
}) {
  const currentUser = getCurrentUser()

  // Await searchParams (Next.js 16 async model)
  const searchParams = await props.searchParams

  // Parse Business Line filter from URL
  const selectedBusinessLineCode = parseBusinessLineParam(searchParams.businessLine)

  // Fetch all data in parallel
  const [allTasks, allOpportunities, businessLines] = await Promise.all([
    getTasks({ owner: currentUser, maxRecords: 500 }),
    getOpportunities({ maxRecords: 500 }),
    getBusinessLines(),
  ])

  // Filter by Business Line
  const filteredOpportunities = filterOpportunitiesByBusinessLine(
    allOpportunities,
    businessLines,
    selectedBusinessLineCode
  )

  const filteredTasks = filterTasksByBusinessLine(
    allTasks,
    allOpportunities,
    businessLines,
    selectedBusinessLineCode
  )

  // Filter tasks by status and date
  const todoTasks = filteredTasks.filter((t) => t.status === 'TODO')

  const overdueTasks = todoTasks.filter(
    (t) => t.dueAt && isOverdue(t.dueAt)
  )

  const todayTasks = todoTasks.filter((t) => t.dueAt && isToday(t.dueAt))

  // Separate meetings from regular tasks
  const todayMeetings = todayTasks.filter((t) => t.type === 'MEETING')
  const todayOtherTasks = todayTasks.filter((t) => t.type !== 'MEETING')

  // Find opportunities without next action
  const activeOpportunities = filteredOpportunities.filter(
    (opp) =>
      opp.owner === currentUser &&
      opp.stage !== 'Gagné' &&
      opp.stage !== 'Perdu'
  )

  // Map opportunity IDs to their TODO tasks
  const opportunityTaskMap: Record<string, boolean> = {}
  todoTasks.forEach((task) => {
    if (task.opportunityId) {
      opportunityTaskMap[task.opportunityId] = true
    }
  })

  // Opportunities without any TODO task
  const opportunitiesWithoutNextAction = activeOpportunities.filter(
    (opp) => !opportunityTaskMap[opp.id]
  )

  // Create business line lookup
  const businessLineMap = Object.fromEntries(
    businessLines.map((bl) => [bl.id, bl])
  )

  const today = new Date()

  // Focus-eligible tasks: use SHARED eligibility logic (single source of truth)
  // This ensures Today CTA count === Focus queue length
  const focusableTasks = filterFocusEligible(filteredTasks, today)

  return (
    <div className="space-y-6">
      <TodayHero
        userName={getCurrentUserDisplayName()}
        todayDate={formatFrenchDate(today)}
        overdueCount={overdueTasks.length}
        todayTasksCount={todayOtherTasks.length}
        meetingsCount={todayMeetings.length}
        noNextActionCount={opportunitiesWithoutNextAction.length}
        focusableCount={focusableTasks.length}
        businessLines={businessLines}
        selectedBusinessLineCode={selectedBusinessLineCode}
      />

      <div className="space-y-6">
        {overdueTasks.length > 0 && (
          <OverdueSection
            tasks={overdueTasks}
            businessLineMap={businessLineMap}
          />
        )}

        {todayMeetings.length > 0 && (
          <TodayMeetingsSection
            meetings={todayMeetings}
            businessLineMap={businessLineMap}
          />
        )}

        {todayOtherTasks.length > 0 && (
          <TodayTasksSection
            tasks={todayOtherTasks}
            businessLineMap={businessLineMap}
          />
        )}

        {opportunitiesWithoutNextAction.length > 0 && (
          <NoNextActionSection
            opportunities={opportunitiesWithoutNextAction}
            businessLineMap={businessLineMap}
          />
        )}

        {/* All sections empty state */}
        {overdueTasks.length === 0 &&
          todayMeetings.length === 0 &&
          todayOtherTasks.length === 0 &&
          opportunitiesWithoutNextAction.length === 0 && (
            <div className="text-center py-12 text-text-muted">
              <p>Rien à faire aujourd'hui. Excellente journée !</p>
            </div>
          )}
      </div>
    </div>
  )
}
