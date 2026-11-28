'use client'

// Dashboard Client Component (Phase 6A)
// Commercial piloting cockpit for KLS3 Sales OS

import { useState, useMemo, useEffect } from 'react'
import type { BusinessLine, ValueEvent, Opportunity, Activity, Task, Company, Contact, ColdCallTarget, Goal } from '@/types/domain'
import type { PeriodType } from '@/lib/utils/period'
import { getPeriodDateRange } from '@/lib/utils/period'
import { BusinessLineSelector } from './business-line-selector'
import { PeriodSelector } from './period-selector'
import { GlobalKPIs } from './global-kpis'
import { BusinessLineCards } from './business-line-cards'
import { CommercialActivity } from './commercial-activity'
import { PipelineByStage } from './pipeline-by-stage'
import { Attention } from './attention'
import { TopOpportunities } from './top-opportunities'
import { GoalsProgress } from './goals-progress'
import { BusinessLineKpis } from './business-line-kpis'

interface DashboardClientProps {
  businessLines: BusinessLine[]
  valueEvents: ValueEvent[]
  opportunities: Opportunity[]
  activities: Activity[]
  tasks: Task[]
  companies: Company[]
  contacts: Contact[]
  coldCallTargets: ColdCallTarget[]
  goals: Goal[]
  goalsError: boolean
}

export function DashboardClient({
  businessLines,
  valueEvents,
  opportunities,
  activities,
  tasks,
  companies,
  contacts,
  coldCallTargets,
  goals,
  goalsError,
}: DashboardClientProps) {
  // State
  const [selectedBusinessLineId, setSelectedBusinessLineId] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month') // Default: managerial monthly perspective
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Remember whether "Détails" is open, per browser (convenience only)
  useEffect(() => {
    try {
      if (window.localStorage.getItem('dashboard.detailsOpen') === '1') setDetailsOpen(true)
    } catch {}
  }, [])
  useEffect(() => {
    try {
      window.localStorage.setItem('dashboard.detailsOpen', detailsOpen ? '1' : '0')
    } catch {}
  }, [detailsOpen])

  // Compute period date range
  const periodRange = useMemo(() => {
    return getPeriodDateRange(selectedPeriod)
  }, [selectedPeriod])

  // Filter data by period
  const periodFilteredValueEvents = useMemo(() => {
    return valueEvents.filter((ve) => {
      if (!ve.eventDate) return false
      const eventDate = new Date(ve.eventDate)
      return eventDate >= periodRange.start && eventDate <= periodRange.end
    })
  }, [valueEvents, periodRange])

  const periodFilteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (!activity.date) return false
      const activityDate = new Date(activity.date)
      return activityDate >= periodRange.start && activityDate <= periodRange.end
    })
  }, [activities, periodRange])

  // Handler for Business Line card clicks
  const handleSelectBusinessLine = (businessLineId: string) => {
    setSelectedBusinessLineId(businessLineId)
  }

  // Determine if showing "Toutes" view
  const showBusinessLineCards = selectedBusinessLineId === null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold font-syne mb-2">Dashboard</h1>
        <p className="text-text-muted">
          Pilotage commercial · Où en est KLS3 ? Quelle Business Line produit de la valeur ?
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Business Line Selector */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px w-7 bg-accent" />
            <h2 className="text-xs uppercase tracking-wide text-accent font-medium">
              Business Line
            </h2>
          </div>
          <BusinessLineSelector
            businessLines={businessLines}
            selectedBusinessLineId={selectedBusinessLineId}
            onSelect={setSelectedBusinessLineId}
          />
        </div>

        {/* Period Selector */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px w-7 bg-accent" />
            <h2 className="text-xs uppercase tracking-wide text-accent font-medium">
              Période
            </h2>
          </div>
          <PeriodSelector
            selectedPeriod={selectedPeriod}
            onSelect={setSelectedPeriod}
          />
        </div>
      </div>

      {/* 6 KPI par business line (Trello #62): activité → conversion → valeur */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px w-7 bg-accent" />
          <h2 className="text-xs uppercase tracking-wide text-accent font-medium">
            6 KPI par business line
          </h2>
        </div>
        <BusinessLineKpis
          businessLines={businessLines}
          selectedBusinessLineId={selectedBusinessLineId}
          period={periodRange}
          data={{ activities, opportunities, coldCallTargets, valueEvents }}
          onSelectBusinessLine={handleSelectBusinessLine}
        />
      </section>

      {/* Global KPIs */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px w-7 bg-accent" />
          <h2 className="text-xs uppercase tracking-wide text-accent font-medium">
            KPI Globaux
          </h2>
        </div>
        <GlobalKPIs
          valueEvents={valueEvents}
          periodFilteredValueEvents={periodFilteredValueEvents}
          opportunities={opportunities}
          businessLines={businessLines}
          selectedBusinessLineId={selectedBusinessLineId}
        />
      </section>

      {/* Objectifs vs Réalisé (Trello #61) */}
      <GoalsProgress
        goals={goals}
        goalsError={goalsError}
        businessLines={businessLines}
        selectedBusinessLineId={selectedBusinessLineId}
        period={periodRange}
        data={{ activities, opportunities, coldCallTargets, valueEvents }}
      />

      {/* À surveiller: actionable, kept visible */}
      <Attention
        opportunities={opportunities}
        tasks={tasks}
        valueEvents={valueEvents}
        activities={activities}
        selectedBusinessLineId={selectedBusinessLineId}
        businessLines={businessLines}
      />

      {/* Détails (Trello #62): earlier blocks folded, nothing removed */}
      <details
        className="group rounded-2xl border-[0.5px] border-border"
        open={detailsOpen}
        onToggle={(event) => setDetailsOpen((event.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer list-none rounded-2xl px-4 py-3 text-sm text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <span className="mr-2 inline-block transition-transform group-open:rotate-90" aria-hidden="true">›</span>
          Détails : cartes business line, activité commerciale, pipeline par étape, opportunités à suivre
        </summary>
        <div className="space-y-8 px-1 pb-4 pt-2">
          {showBusinessLineCards && (
            <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px w-7 bg-accent" />
          <h2 className="text-xs uppercase tracking-wide text-accent font-medium">
            Business Lines
          </h2>
        </div>
              <BusinessLineCards
                businessLines={businessLines}
                valueEvents={valueEvents}
                periodFilteredValueEvents={periodFilteredValueEvents}
                opportunities={opportunities}
                activities={periodFilteredActivities}
                tasks={tasks}
                onSelectBusinessLine={handleSelectBusinessLine}
              />
            </section>
          )}

          <CommercialActivity
            activities={periodFilteredActivities}
            opportunities={opportunities}
            businessLines={businessLines}
            selectedBusinessLineId={selectedBusinessLineId}
            period={periodRange}
            selectedPeriod={selectedPeriod}
            coldCallTargets={coldCallTargets}
          />

          <div className="grid min-w-0 gap-6 xl:grid-cols-[40%_60%] [&>*]:min-w-0">
            <PipelineByStage
              opportunities={opportunities}
              selectedBusinessLineId={selectedBusinessLineId}
            />
            <TopOpportunities
              opportunities={opportunities}
              businessLines={businessLines}
              companies={companies}
              contacts={contacts}
              tasks={tasks}
              selectedBusinessLineId={selectedBusinessLineId}
            />
          </div>
        </div>
      </details>
    </div>
  )
}
