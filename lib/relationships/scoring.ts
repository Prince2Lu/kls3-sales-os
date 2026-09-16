// Relationship priority scoring
// Deterministic scoring system for relationship prioritization

import type { RelationshipWithInteractions } from './helpers'
import type { Opportunity } from '@/types/domain'
import { PRIORITY_WEIGHTS } from './config'
import { getRelationshipSignals, hasSignal } from './signals'

/**
 * Relationship with priority score and signals
 */
export interface RelationshipWithPriority extends RelationshipWithInteractions {
  priorityScore: number
  signals: ReturnType<typeof getRelationshipSignals>
}

/**
 * Calculate priority score for a relationship
 *
 * SCORING LOGIC (additive):
 * - Importance: High=10, Normal=5, Low=2
 * - Status: Active=5, Planned=3, ToActivate=1
 * - NO NEXT ACTION penalty: +15 (critical issue for active relationships)
 * - OVERDUE ACTION penalty: +25 (most urgent)
 * - DORMANT WARNING penalty: +10 (30-60 days)
 * - DORMANT CRITICAL penalty: +20 (60+ days)
 * - ACTIVE INTRODUCER bonus: +8
 * - SUCCESSFUL INTRODUCER bonus: +15
 * - RECENTLY ACTIVE bonus: +5
 *
 * Higher score = higher priority
 * Penalties increase score (need attention)
 * Bonuses increase score (valuable relationships)
 */
export function calculatePriorityScore(
  relationship: RelationshipWithInteractions,
  introducedOpportunities?: Opportunity[]
): number {
  let score = 0

  // Get signals for this relationship
  const signals = getRelationshipSignals(relationship, introducedOpportunities)

  // IMPORTANCE FACTOR
  switch (relationship.importance) {
    case 'Haute':
      score += PRIORITY_WEIGHTS.IMPORTANCE_HIGH
      break
    case 'Normale':
      score += PRIORITY_WEIGHTS.IMPORTANCE_NORMAL
      break
    case 'Faible':
      score += PRIORITY_WEIGHTS.IMPORTANCE_LOW
      break
  }

  // STATUS FACTOR
  switch (relationship.status) {
    case 'Actif':
      score += PRIORITY_WEIGHTS.STATUS_ACTIVE
      break
    case 'Action prévue':
    case 'En discussion':
      score += PRIORITY_WEIGHTS.STATUS_PLANNED
      break
    case 'À activer':
      score += PRIORITY_WEIGHTS.STATUS_TO_ACTIVATE
      break
    // Dormant and Clos: no status bonus
  }

  // SIGNAL-BASED PENALTIES AND BONUSES

  if (hasSignal(signals, 'OVERDUE_ACTION')) {
    score += PRIORITY_WEIGHTS.OVERDUE_ACTION_PENALTY
  }

  if (hasSignal(signals, 'NO_NEXT_ACTION')) {
    score += PRIORITY_WEIGHTS.NO_NEXT_ACTION_PENALTY
  }

  if (hasSignal(signals, 'DORMANT_CRITICAL')) {
    score += PRIORITY_WEIGHTS.DORMANT_CRITICAL_PENALTY
  } else if (hasSignal(signals, 'DORMANT_WARNING')) {
    score += PRIORITY_WEIGHTS.DORMANT_WARNING_PENALTY
  }

  if (hasSignal(signals, 'SUCCESSFUL_INTRODUCER')) {
    score += PRIORITY_WEIGHTS.SUCCESSFUL_INTRODUCER_BONUS
  } else if (hasSignal(signals, 'ACTIVE_INTRODUCER')) {
    score += PRIORITY_WEIGHTS.ACTIVE_INTRODUCER_BONUS
  }

  if (hasSignal(signals, 'RECENTLY_ACTIVE')) {
    score += PRIORITY_WEIGHTS.RECENTLY_ACTIVE_BONUS
  }

  return score
}

/**
 * Enrich relationships with priority scores and signals
 */
export function enrichWithPriority(
  relationships: RelationshipWithInteractions[],
  allOpportunities: Opportunity[]
): RelationshipWithPriority[] {
  // Build opportunityIntroducerMap for efficient lookup
  const opportunityIntroducerMap = new Map<string, Opportunity[]>()

  allOpportunities.forEach((opp) => {
    if (opp.introducedByRelationshipId) {
      const existing = opportunityIntroducerMap.get(
        opp.introducedByRelationshipId
      )
      if (existing) {
        existing.push(opp)
      } else {
        opportunityIntroducerMap.set(opp.introducedByRelationshipId, [opp])
      }
    }
  })

  // Enrich each relationship
  return relationships.map((relationship) => {
    const introducedOpportunities =
      opportunityIntroducerMap.get(relationship.id) || []

    const signals = getRelationshipSignals(
      relationship,
      introducedOpportunities
    )

    const priorityScore = calculatePriorityScore(
      relationship,
      introducedOpportunities
    )

    return {
      ...relationship,
      priorityScore,
      signals,
    }
  })
}

/**
 * Sort relationships by priority score (descending)
 * Higher score = higher priority
 */
export function sortByPriority(
  relationships: RelationshipWithPriority[]
): RelationshipWithPriority[] {
  return [...relationships].sort((a, b) => b.priorityScore - a.priorityScore)
}

/**
 * Filter relationships that need action today
 * Includes: OVERDUE, NO_NEXT_ACTION, DORMANT_CRITICAL, HIGH_IMPORTANCE + active
 */
export function getActionableToday(
  relationships: RelationshipWithPriority[]
): RelationshipWithPriority[] {
  return relationships.filter((r) => {
    const { signals, status } = r

    // Always include overdue actions
    if (hasSignal(signals, 'OVERDUE_ACTION')) return true

    // Active relationships without next action
    if (hasSignal(signals, 'NO_NEXT_ACTION')) return true

    // Critical dormancy
    if (hasSignal(signals, 'DORMANT_CRITICAL')) return true

    // High importance + active status without recent interaction
    if (
      hasSignal(signals, 'HIGH_IMPORTANCE') &&
      (status === 'Actif' || status === 'Action prévue') &&
      !hasSignal(signals, 'RECENTLY_ACTIVE')
    ) {
      return true
    }

    return false
  })
}
