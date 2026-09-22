// Ma journée page (Phase 6C-B + Today V2)
// Operational daily workspace with Business Line filtering
// V2: Added watchlist (hot opportunities without activity) and work blocks

import {
  getTasks,
  getOpportunities,
  getBusinessLines,
  getActivities,
  getColdCallTargets,
  getCompanies,
  getContacts,
  getRelationships,
} from '@/lib/airtable'
import { getCurrentOwner, getCurrentOwnerDisplayName } from '@/lib/utils/current-owner'
import { isOverdue, isToday, formatFrenchDate } from '@/lib/utils/date'
import {
  parseBusinessLineParam,
  filterOpportunitiesByBusinessLine,
  filterTasksByBusinessLine,
} from '@/lib/utils/business-line-filter'
import { filterFocusEligible } from '@/lib/utils/focus-eligibility'
import { getDaysDifferenceInParis, getNowInParis } from '@/lib/utils/timezone'
import { TodayHero } from './today-hero'
import { OverdueSection } from './overdue-section'
import { TodayTasksSection } from './today-tasks-section'
import { TodayMeetingsSection } from './today-meetings-section'
import { NoNextActionSection } from './no-next-action-section'
import { WatchlistSection } from './watchlist-section'
import { WorkBlocksSection } from './work-blocks-section'
import { RelationshipsSection } from './relationships-section'
import type { CallStatus, Stage, Owner } from '@/types/domain'
import { enrichRelationshipsWithInteractions } from '@/lib/relationships/helpers'
import { enrichWithPriority, getActionableToday } from '@/lib/relationships/scoring'

export default async function TodayPage(props: {
  searchParams: Promise<{ businessLine?: string }>
}) {
  const currentOwner = await getCurrentOwner()

  // Await searchParams (Next.js 16 async model)
  const searchParams = await props.searchParams

  // Parse Business Line filter from URL
  const selectedBusinessLineCode = parseBusinessLineParam(searchParams.businessLine)

  // Fetch all data in parallel - NO LIMITS (personal view, should be manageable)
  const [
    allTasks,
    allOpportunities,
    businessLines,
    allActivities,
    allTargets,
    companies,
    contacts,
    relationships,
  ] = await Promise.all([
    getTasks({ owner: currentOwner }), // No limit - all tasks for current owner
    getOpportunities(), // No limit - all opportunities (filtered later)
    getBusinessLines(),
    getActivities(), // No limit - all activities for watchlist calculation
    getColdCallTargets(), // No limit - all targets for work blocks
    getCompanies(), // No limit - all companies for display
    getContacts(), // No limit - all contacts for display
    getRelationships({ maxRecords: 1000 }), // All relationships for current owner
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
    selectedBusinessLineCode,
    allTargets
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
      opp.owner === currentOwner &&
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

  const today = new Date()

  // Focus-eligible tasks: use SHARED eligibility logic (single source of truth)
  // This ensures Today CTA count === Focus queue length
  const focusableTasks = filterFocusEligible(filteredTasks, today)

  // ============================================================================
  // WATCHLIST (À surveiller) - V2
  // Hot opportunities (RDV/Opportunité/Proposition) without activity for 7+ days
  // ============================================================================

  const WATCHLIST_STAGES = ['RDV', 'Opportunité', 'Proposition']
  const WATCHLIST_THRESHOLD_DAYS = 7

  // Filter opportunities in hot stages
  const hotStageOpportunities = activeOpportunities.filter((opp) =>
    WATCHLIST_STAGES.includes(opp.stage)
  )

  // Group activities by opportunityId and find most recent activity date
  const activityByOpportunityId: Record<string, Date> = {}
  allActivities.forEach((activity) => {
    if (activity.opportunityId && activity.date) {
      const activityDate = new Date(activity.date)
      const existingDate = activityByOpportunityId[activity.opportunityId]
      if (!existingDate || activityDate > existingDate) {
        activityByOpportunityId[activity.opportunityId] = activityDate
      }
    }
  })

  // Calculate days since last activity for each hot opportunity (Europe/Paris timezone)
  const todayParis = getNowInParis()
  const daysSinceActivityMap: Record<string, number> = {}
  const watchlistOpportunities = hotStageOpportunities.filter((opp) => {
    // Must not have any TODO tasks
    if (opportunityTaskMap[opp.id]) {
      return false
    }

    // Calculate days since last activity using Europe/Paris calendar days
    const lastActivityDate = activityByOpportunityId[opp.id]
    if (!lastActivityDate) {
      // No activity ever - should be flagged
      daysSinceActivityMap[opp.id] = 999
      return true
    }

    const daysSince = getDaysDifferenceInParis(lastActivityDate, todayParis)
    daysSinceActivityMap[opp.id] = daysSince

    return daysSince >= WATCHLIST_THRESHOLD_DAYS
  })

  // ============================================================================
  // WORK BLOCKS (Continuer la prospection) - V2
  // Display counters for non-empty work blocks per Business Line
  // ============================================================================

  // Pre-RDV prospecting statuses (for PROSPECTING_TARGETS)
  // Multi-channel: cold call, email, LinkedIn, referrals, etc.
  const PRE_RDV_STATUSES: CallStatus[] = [
    'À appeler',
    'À rappeler',
    'Email Flow',
    'Mauvais numéro',
    'Pas intéressé',
    'RDV booké',
    'Converti',
  ]

  // Post-RDV opportunity stages
  const POST_RDV_STAGES: Stage[] = [
    'RDV',
    'Opportunité',
    'Proposition',
    'Gagné',
    'Perdu',
  ]

  // Terminal states to exclude from work blocks
  const TERMINAL_STATES = ['Mauvais numéro', 'Pas intéressé', 'Gagné', 'Perdu']

  interface WorkBlock {
    businessLine: (typeof businessLines)[0]
    status: CallStatus | Stage
    count: number
    statusType: 'PRE_RDV' | 'POST_RDV'
  }

  // Build work blocks
  const workBlocks: WorkBlock[] = []

  businessLines.forEach((bl) => {
    // PRE_RDV blocks: Count targets by call status (exclude those with opportunityId - anti-doublon)
    PRE_RDV_STATUSES.forEach((status) => {
      if (TERMINAL_STATES.includes(status)) return // Skip terminal states

      const count = allTargets.filter(
        (target) =>
          target.businessLineId === bl.id &&
          target.callStatus === status &&
          !target.opportunityId && // Anti-doublon: exclude converted targets
          target.owner === currentOwner // Personal scope strict
      ).length

      if (count > 0) {
        workBlocks.push({
          businessLine: bl,
          status,
          count,
          statusType: 'PRE_RDV',
        })
      }
    })

    // POST_RDV blocks: Count opportunities by stage
    POST_RDV_STAGES.forEach((stage) => {
      if (TERMINAL_STATES.includes(stage)) return // Skip terminal states

      const count = allOpportunities.filter(
        (opp) =>
          opp.businessLineId === bl.id &&
          opp.stage === stage &&
          opp.owner === currentOwner // Personal scope
      ).length

      if (count > 0) {
        workBlocks.push({
          businessLine: bl,
          status: stage,
          count,
          statusType: 'POST_RDV',
        })
      }
    })
  })

  // ============================================================================
  // RELATIONSHIPS TO WORK - Phase 3
  // Actionable relationships needing attention today
  // ============================================================================

  // Filter relationships by owner
  const ownerRelationships = relationships.filter((r) => r.owner === currentOwner)

  // Enrich with interactions
  const enrichedRelationships = enrichRelationshipsWithInteractions(
    ownerRelationships,
    allActivities,
    allTasks
  )

  // Enrich with priority scores and signals
  const relationshipsWithPriority = enrichWithPriority(
    enrichedRelationships,
    allOpportunities
  )

  // Get actionable relationships for today
  const actionableRelationships = getActionableToday(relationshipsWithPriority)

  // Create lookup maps for sections
  const businessLineMap = Object.fromEntries(
    businessLines.map((bl) => [bl.id, bl])
  )
  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c]))
  const contactMap = Object.fromEntries(contacts.map((c) => [c.id, c]))

  return (
    <div className="space-y-6">
      <TodayHero
        userName={await getCurrentOwnerDisplayName()}
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
        {/* 1. En retard */}
        {overdueTasks.length > 0 && (
          <OverdueSection
            tasks={overdueTasks}
            businessLineMap={businessLineMap}
          />
        )}

        {/* 2. Aujourd'hui */}
        {todayOtherTasks.length > 0 && (
          <TodayTasksSection
            tasks={todayOtherTasks}
            businessLineMap={businessLineMap}
          />
        )}

        {/* 3. RDV du jour */}
        {todayMeetings.length > 0 && (
          <TodayMeetingsSection
            meetings={todayMeetings}
            businessLineMap={businessLineMap}
          />
        )}

        {/* 4. Relations à travailler (Phase 3) */}
        <RelationshipsSection relationships={actionableRelationships} />

        {/* 5. À surveiller (V2 - Watchlist) */}
        <WatchlistSection
          opportunities={watchlistOpportunities}
          businessLineMap={businessLineMap}
          companyMap={companyMap}
          contactMap={contactMap}
          daysSinceActivityMap={daysSinceActivityMap}
        />

        {/* 6. Continuer la prospection (V2 - Work blocks) */}
        <WorkBlocksSection
          workBlocks={workBlocks}
          currentOwner={currentOwner}
        />

        {/* Legacy: Opportunities without next action (replaced by Watchlist logic but kept for other stages) */}
        {opportunitiesWithoutNextAction.filter(
          (opp) => !WATCHLIST_STAGES.includes(opp.stage)
        ).length > 0 && (
          <NoNextActionSection
            opportunities={opportunitiesWithoutNextAction.filter(
              (opp) => !WATCHLIST_STAGES.includes(opp.stage)
            )}
            businessLineMap={businessLineMap}
          />
        )}

        {/* All sections empty state */}
        {overdueTasks.length === 0 &&
          todayMeetings.length === 0 &&
          todayOtherTasks.length === 0 &&
          actionableRelationships.length === 0 &&
          watchlistOpportunities.length === 0 &&
          workBlocks.length === 0 &&
          opportunitiesWithoutNextAction.filter(
            (opp) => !WATCHLIST_STAGES.includes(opp.stage)
          ).length === 0 && (
            <div className="text-center py-12 text-text-muted">
              <p>Rien à faire aujourd'hui. Excellente journée !</p>
            </div>
          )}
      </div>
    </div>
  )
}
