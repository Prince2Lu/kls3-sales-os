'use client'

// Dashboard Client Component (Phase 6A)
// Commercial piloting cockpit for KLS3 Sales OS

import { useState, useMemo } from 'react'
import type { BusinessLine, ValueEvent, Opportunity, Activity, Task, Company, Contact } from '@/types/domain'
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

interface DashboardClientProps {
  businessLines: BusinessLine[]
  valueEvents: ValueEvent[]
  opportunities: Opportunity[]
  activities: Activity[]
  tasks: Task[]
  companies: Company[]
  contacts: Contact[]
  currentOwner: 'Eric' | 'Lilian'
}

export function DashboardClient({
  businessLines,
  valueEvents,
  opportunities,
  activities,
  tasks,
  companies,
  contacts,
  currentOwner,
}: DashboardClientProps) {
  // State
  const [selectedBusinessLineId, setSelectedBusinessLineId] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month') // Default: managerial monthly perspective

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
        <h1 className="text-4xl font-bold font-syne mb-2">Dashboard</h1>
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

      {/* Global KPIs */}
      <div>
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
      </div>

      {/* Business Line Cards (Toutes view only) */}
      {showBusinessLineCards && (
        <div>
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
        </div>
      )}

      {/* Commercial Activity */}
      <CommercialActivity
        activities={periodFilteredActivities}
        opportunities={opportunities}
        businessLines={businessLines}
        selectedBusinessLineId={selectedBusinessLineId}
        period={periodRange}
        selectedPeriod={selectedPeriod}
      />

      {/* Lower Dashboard: 3-Column Layout - CURRENT STATE */}
      <div className="grid gap-6 lg:grid-cols-[32%_22%_46%]">
        {/* Pipeline by Stage */}
        <PipelineByStage
          opportunities={opportunities}
          selectedBusinessLineId={selectedBusinessLineId}
        />

        {/* À surveiller - Compact vertical panel */}
        <Attention
          opportunities={opportunities}
          tasks={tasks}
          selectedBusinessLineId={selectedBusinessLineId}
          businessLines={businessLines}
          currentOwner={currentOwner}
        />

        {/* Opportunités à suivre - Dense rows */}
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
  )
}
