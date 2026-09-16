// Relationship health assessment
// Simple health status based on signals

import type { RelationshipWithPriority } from './scoring'
import { hasSignal } from './signals'

/**
 * RELATIONSHIP HEALTH STATUS
 * Simplified health indicator for relationship state
 */
export type RelationshipHealth =
  | 'HEALTHY' // Good state: has next action, not dormant
  | 'NEEDS_ATTENTION' // Warning: dormant or no next action
  | 'URGENT' // Critical: overdue or critical dormancy
  | 'INACTIVE' // Dormant or Clos status

/**
 * Determine relationship health from signals
 *
 * RULES:
 * 1. URGENT: OVERDUE_ACTION or DORMANT_CRITICAL
 * 2. INACTIVE: Status = 'Dormant' or 'Clos'
 * 3. NEEDS_ATTENTION: NO_NEXT_ACTION or DORMANT_WARNING or HIGH_IMPORTANCE without recent activity
 * 4. HEALTHY: All other cases
 */
export function getRelationshipHealth(
  relationship: RelationshipWithPriority
): RelationshipHealth {
  const { signals, status } = relationship

  // URGENT: Overdue or critical dormancy
  if (
    hasSignal(signals, 'OVERDUE_ACTION') ||
    hasSignal(signals, 'DORMANT_CRITICAL')
  ) {
    return 'URGENT'
  }

  // INACTIVE: Dormant or Clos status
  if (status === 'Dormant' || status === 'Clos') {
    return 'INACTIVE'
  }

  // NEEDS_ATTENTION: Missing next action, warning dormancy, or high importance without recent activity
  if (
    hasSignal(signals, 'NO_NEXT_ACTION') ||
    hasSignal(signals, 'DORMANT_WARNING')
  ) {
    return 'NEEDS_ATTENTION'
  }

  // High importance relationships should be checked if not recently active
  const isActive =
    status === 'Actif' ||
    status === 'Action prévue' ||
    status === 'En discussion'

  if (
    isActive &&
    hasSignal(signals, 'HIGH_IMPORTANCE') &&
    !hasSignal(signals, 'RECENTLY_ACTIVE')
  ) {
    return 'NEEDS_ATTENTION'
  }

  // HEALTHY: Default state
  return 'HEALTHY'
}

/**
 * Get health badge color for UI
 * Note: Badge component supports 'default' | 'accent' | 'muted'
 * URGENT mapped to 'accent' (same as NEEDS_ATTENTION but different label)
 */
export function getHealthBadgeVariant(
  health: RelationshipHealth
): 'default' | 'accent' | 'muted' {
  switch (health) {
    case 'URGENT':
      return 'accent' // No destructive variant, use accent for urgency
    case 'NEEDS_ATTENTION':
      return 'accent'
    case 'HEALTHY':
      return 'default'
    case 'INACTIVE':
      return 'muted'
  }
}

/**
 * Get French health label
 */
export function getHealthLabel(health: RelationshipHealth): string {
  switch (health) {
    case 'HEALTHY':
      return 'Saine'
    case 'NEEDS_ATTENTION':
      return 'À suivre'
    case 'URGENT':
      return 'Urgent'
    case 'INACTIVE':
      return 'Inactive'
  }
}
