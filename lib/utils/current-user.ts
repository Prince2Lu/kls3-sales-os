// Current user context for KLS3 Sales OS
// Temporary hardcoded owner until Phase 8 authentication is implemented

import type { Owner } from '@/types/domain'

/**
 * Get the current operational user
 * Phase 4: Hardcoded to Lilian
 * Phase 8: Will be replaced with authenticated user context
 */
export function getCurrentUser(): Owner {
  // TODO Phase 8: Replace with authenticated user
  return 'Lilian'
}

/**
 * Get the current user's display name
 */
export function getCurrentUserDisplayName(): string {
  const user = getCurrentUser()
  return user
}
