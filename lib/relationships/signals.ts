// Relationship commercial signals
// Determines actionable signals for relationship management

import type { RelationshipWithInteractions } from './helpers'
import type { Opportunity } from '@/types/domain'
import { DORMANCY_CONFIG, RECENTLY_ACTIVE_DAYS } from './config'

/**
 * RELATIONSHIP SIGNALS
 * Actionable commercial signals derived from relationship state
 */
export type RelationshipSignal =
  | 'OVERDUE_ACTION' // Next action is overdue (most urgent)
  | 'NO_NEXT_ACTION' // Active relationship without next action
  | 'DORMANT_CRITICAL' // 60+ days without interaction (critical)
  | 'DORMANT_WARNING' // 30-60 days without interaction (warning)
  | 'HIGH_IMPORTANCE' // Haute importance relationship
  | 'ACTIVE_INTRODUCER' // Has introduced at least 1 opportunity
  | 'SUCCESSFUL_INTRODUCER' // Has introduced at least 1 won opportunity
  | 'RECENTLY_ACTIVE' // Interaction in last 7 days
  | 'UPCOMING_ACTION' // Next action in next 7 days

/**
 * Calculate days since last interaction
 * Returns null if no interaction recorded
 */
export function getDaysSinceLastInteraction(
  relationship: RelationshipWithInteractions
): number | null {
  if (!relationship.lastInteraction) return null

  const lastInteractionDate = new Date(relationship.lastInteraction)
  const now = new Date()
  const diffMs = now.getTime() - lastInteractionDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Calculate days until next action
 * Returns null if no next action or no due date
 * Negative number means overdue
 */
export function getDaysUntilNextAction(
  relationship: RelationshipWithInteractions
): number | null {
  if (!relationship.nextActionDueAt) return null

  const dueDate = new Date(relationship.nextActionDueAt)
  const now = new Date()
  const diffMs = dueDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Determine all signals for a relationship
 * Returns array of active signals
 */
export function getRelationshipSignals(
  relationship: RelationshipWithInteractions,
  introducedOpportunities?: Opportunity[]
): RelationshipSignal[] {
  const signals: RelationshipSignal[] = []

  // OVERDUE_ACTION: Next action overdue
  const daysUntilAction = getDaysUntilNextAction(relationship)
  if (daysUntilAction !== null && daysUntilAction < 0) {
    signals.push('OVERDUE_ACTION')
  }

  // UPCOMING_ACTION: Next action in next 7 days
  if (daysUntilAction !== null && daysUntilAction >= 0 && daysUntilAction <= 7) {
    signals.push('UPCOMING_ACTION')
  }

  // NO_NEXT_ACTION: Active relationship without next action
  const isActive =
    relationship.status === 'Actif' ||
    relationship.status === 'Action prévue' ||
    relationship.status === 'En discussion'

  if (isActive && !relationship.nextActionTaskId) {
    signals.push('NO_NEXT_ACTION')
  }

  // DORMANCY: Check days since last interaction
  const daysSinceInteraction = getDaysSinceLastInteraction(relationship)

  if (daysSinceInteraction !== null) {
    if (daysSinceInteraction >= DORMANCY_CONFIG.CRITICAL_DAYS) {
      signals.push('DORMANT_CRITICAL')
    } else if (daysSinceInteraction >= DORMANCY_CONFIG.WARNING_DAYS) {
      signals.push('DORMANT_WARNING')
    }
  }

  // HIGH_IMPORTANCE: Haute importance
  if (relationship.importance === 'Haute') {
    signals.push('HIGH_IMPORTANCE')
  }

  // RECENTLY_ACTIVE: Interaction in last 7 days
  if (
    daysSinceInteraction !== null &&
    daysSinceInteraction <= RECENTLY_ACTIVE_DAYS
  ) {
    signals.push('RECENTLY_ACTIVE')
  }

  // INTRODUCER SIGNALS: Check introduced opportunities
  if (introducedOpportunities && introducedOpportunities.length > 0) {
    signals.push('ACTIVE_INTRODUCER')

    // Check for won opportunities
    const wonOpportunities = introducedOpportunities.filter(
      (opp) => opp.stage === 'Gagné'
    )
    if (wonOpportunities.length > 0) {
      signals.push('SUCCESSFUL_INTRODUCER')
    }
  }

  return signals
}

/**
 * Check if relationship has a specific signal
 */
export function hasSignal(
  signals: RelationshipSignal[],
  signal: RelationshipSignal
): boolean {
  return signals.includes(signal)
}

/**
 * Get most urgent signal from array
 * Returns null if no signals
 */
export function getMostUrgentSignal(
  signals: RelationshipSignal[]
): RelationshipSignal | null {
  // Priority order (most urgent first)
  const priorityOrder: RelationshipSignal[] = [
    'OVERDUE_ACTION',
    'NO_NEXT_ACTION',
    'DORMANT_CRITICAL',
    'DORMANT_WARNING',
    'HIGH_IMPORTANCE',
    'UPCOMING_ACTION',
    'SUCCESSFUL_INTRODUCER',
    'ACTIVE_INTRODUCER',
    'RECENTLY_ACTIVE',
  ]

  for (const signal of priorityOrder) {
    if (signals.includes(signal)) {
      return signal
    }
  }

  return null
}
