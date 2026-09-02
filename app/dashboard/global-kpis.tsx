// Global KPI cards for Dashboard
// Partner Revenue (PERIOD), Owned Revenue (PERIOD), MRR (CURRENT STATE), Pipeline (CURRENT STATE)

import type { ValueEvent, Opportunity, BusinessLine } from '@/types/domain'
import {
  calculatePartnerRevenue,
  calculateOwnedRevenue,
  calculateMRR,
  calculatePipeline,
} from '@/lib/utils/dashboard-kpis'

interface GlobalKPIsProps {
  valueEvents: ValueEvent[] // ALL Value Events (for CURRENT STATE metrics like MRR)
  periodFilteredValueEvents: ValueEvent[] // Period-filtered (for PERIOD FLOW metrics like revenue)
  opportunities: Opportunity[]
  businessLines: BusinessLine[]
  selectedBusinessLineId: string | null
}

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} €`
}

function formatMRR(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} € / mois`
}

export function GlobalKPIs({
  valueEvents,
  periodFilteredValueEvents,
  opportunities,
  businessLines,
  selectedBusinessLineId,
}: GlobalKPIsProps) {
  // Filter data by selected Business Line if applicable
  const filteredValueEvents = selectedBusinessLineId
    ? valueEvents.filter((ve) => ve.businessLineId === selectedBusinessLineId)
    : valueEvents

  const filteredPeriodValueEvents = selectedBusinessLineId
    ? periodFilteredValueEvents.filter((ve) => ve.businessLineId === selectedBusinessLineId)
    : periodFilteredValueEvents

  const filteredOpportunities = selectedBusinessLineId
    ? opportunities.filter((opp) => opp.businessLineId === selectedBusinessLineId)
    : opportunities

  // PERIOD FLOW: Partner Revenue (period-filtered)
  const partnerRevenue = selectedBusinessLineId
    ? calculatePartnerRevenue(filteredPeriodValueEvents, businessLines.filter((bl) => bl.id === selectedBusinessLineId))
    : calculatePartnerRevenue(periodFilteredValueEvents, businessLines)

  // PERIOD FLOW: Owned Revenue (period-filtered, excluding MRR)
  const ownedRevenue = selectedBusinessLineId
    ? calculateOwnedRevenue(filteredPeriodValueEvents, businessLines.filter((bl) => bl.id === selectedBusinessLineId))
    : calculateOwnedRevenue(periodFilteredValueEvents, businessLines)

  // CURRENT STATE: MRR (NOT period-filtered)
  // MRR represents current confirmed known MRR from all Value Events
  // LIMITATION: V1 does not model subscription cancellation/end state
  const mrr = selectedBusinessLineId
    ? calculateMRR(filteredValueEvents)
    : calculateMRR(valueEvents)

  // CURRENT STATE: Pipeline (NOT period-filtered)
  const pipeline = calculatePipeline(filteredOpportunities)

  // Determine which KPIs to show based on selection
  const selectedBL = selectedBusinessLineId
    ? businessLines.find((bl) => bl.id === selectedBusinessLineId)
    : null

  const showPartnerRevenue = !selectedBL || selectedBL.category === 'PARTNER'
  const showOwnedRevenue = !selectedBL || selectedBL.category === 'OWNED'
  const showMRR = !selectedBL || selectedBL.code === 'CALYMIA'

  return (
    <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4 bg-[rgba(255,255,255,0.06)] rounded-[20px] overflow-hidden p-1">
      {/* Partner Revenue - PERIOD FLOW */}
      {showPartnerRevenue && (
        <div className="bg-card-bg p-6 rounded-2xl">
          <div className="text-text-muted text-xs uppercase tracking-wide mb-2">
            Partner Revenue
          </div>
          <div className="text-2xl font-semibold font-syne">
            {formatCurrency(partnerRevenue)}
          </div>
          <div className="text-text-muted text-xs mt-1">
            {filteredPeriodValueEvents.filter(
              (ve) =>
                (ve.status === 'CONFIRMED' || ve.status === 'PAID') &&
                ve.revenueType !== 'MRR' &&
                businessLines.find((bl) => bl.id === ve.businessLineId)?.category === 'PARTNER'
            ).length}{' '}
            événement{filteredPeriodValueEvents.filter(
              (ve) =>
                (ve.status === 'CONFIRMED' || ve.status === 'PAID') &&
                ve.revenueType !== 'MRR' &&
                businessLines.find((bl) => bl.id === ve.businessLineId)?.category === 'PARTNER'
            ).length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Owned Revenue - PERIOD FLOW */}
      {showOwnedRevenue && (
        <div className="bg-card-bg p-6 rounded-2xl">
          <div className="text-text-muted text-xs uppercase tracking-wide mb-2">
            Owned Revenue
          </div>
          <div className="text-2xl font-semibold font-syne">
            {formatCurrency(ownedRevenue)}
          </div>
          <div className="text-text-muted text-xs mt-1">
            {filteredPeriodValueEvents.filter(
              (ve) =>
                (ve.status === 'CONFIRMED' || ve.status === 'PAID') &&
                ve.revenueType !== 'MRR' &&
                businessLines.find((bl) => bl.id === ve.businessLineId)?.category === 'OWNED'
            ).length}{' '}
            événement{filteredPeriodValueEvents.filter(
              (ve) =>
                (ve.status === 'CONFIRMED' || ve.status === 'PAID') &&
                ve.revenueType !== 'MRR' &&
                businessLines.find((bl) => bl.id === ve.businessLineId)?.category === 'OWNED'
            ).length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* MRR - CURRENT STATE */}
      {showMRR && (
        <div className="bg-card-bg p-6 rounded-2xl">
          <div className="text-text-muted text-xs uppercase tracking-wide mb-2">
            MRR
          </div>
          <div className="text-2xl font-semibold font-syne">
            {formatMRR(mrr)}
          </div>
          <div className="text-text-muted text-xs mt-1">
            {filteredValueEvents.filter(
              (ve) =>
                (ve.status === 'CONFIRMED' || ve.status === 'PAID') &&
                ve.revenueType === 'MRR'
            ).length}{' '}
            abonnement{filteredValueEvents.filter(
              (ve) =>
                (ve.status === 'CONFIRMED' || ve.status === 'PAID') &&
                ve.revenueType === 'MRR'
            ).length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Pipeline - CURRENT STATE */}
      <div className="bg-card-bg p-6 rounded-2xl">
        <div className="text-text-muted text-xs uppercase tracking-wide mb-2">
          Pipeline
        </div>
        <div className="text-2xl font-semibold font-syne">
          {formatCurrency(pipeline)}
        </div>
        <div className="text-text-muted text-xs mt-1">
          {filteredOpportunities.filter(
            (opp) => opp.stage !== 'Gagné' && opp.stage !== 'Perdu'
          ).length}{' '}
          opportunité{filteredOpportunities.filter(
            (opp) => opp.stage !== 'Gagné' && opp.stage !== 'Perdu'
          ).length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}
