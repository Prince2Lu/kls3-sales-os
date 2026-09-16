// Relationship commercial intelligence configuration
// Centralized thresholds for signals and scoring

/**
 * DORMANCY THRESHOLDS
 * Days since last interaction before flagging relationship
 */
export const DORMANCY_CONFIG = {
  WARNING_DAYS: 30, // Yellow flag: relationship needs attention
  CRITICAL_DAYS: 60, // Red flag: relationship at risk
} as const

/**
 * UPCOMING ACTION THRESHOLD
 * Days ahead to consider an action as "upcoming soon"
 */
export const UPCOMING_ACTION_DAYS = 7

/**
 * PRIORITY SCORING WEIGHTS
 * Simple additive scoring system for relationship prioritization
 * Higher score = higher priority
 */
export const PRIORITY_WEIGHTS = {
  // Importance factor
  IMPORTANCE_HIGH: 10, // Haute importance
  IMPORTANCE_NORMAL: 5, // Normale importance
  IMPORTANCE_LOW: 2, // Faible importance

  // Status factor
  STATUS_ACTIVE: 5, // Actif status
  STATUS_PLANNED: 3, // Action prévue / En discussion
  STATUS_TO_ACTIVATE: 1, // À activer

  // Missing next action penalty (critical issue)
  NO_NEXT_ACTION_PENALTY: 15, // Strong signal: active relationship without action

  // Dormancy penalties
  DORMANT_WARNING_PENALTY: 10, // 30-60 days since last interaction
  DORMANT_CRITICAL_PENALTY: 20, // 60+ days since last interaction

  // Overdue action (critical urgency)
  OVERDUE_ACTION_PENALTY: 25, // Next action is overdue

  // Introducer value bonuses
  ACTIVE_INTRODUCER_BONUS: 8, // Has introduced at least 1 opportunity
  SUCCESSFUL_INTRODUCER_BONUS: 15, // Has introduced at least 1 won opportunity

  // Recent activity bonus
  RECENTLY_ACTIVE_BONUS: 5, // Had interaction in last 7 days
} as const

/**
 * RECENTLY ACTIVE THRESHOLD
 * Days since last interaction to consider relationship "recently active"
 */
export const RECENTLY_ACTIVE_DAYS = 7
