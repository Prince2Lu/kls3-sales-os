// Velocity-specific period utilities (Phase 7C)
// Uses explicit Europe/Paris timezone for all date boundaries
// Reuses timezone.ts infrastructure from Phase 7B

import type { PeriodType } from './period'
import type { DateRange } from './period'
import {
  getNowInParis,
  getStartOfDayParis,
  getEndOfDayParis,
  getStartOfMonthParis,
  addDaysParis,
} from './timezone'

/**
 * Get start of week (Monday) in Europe/Paris
 */
function getStartOfWeekParis(date: Date): Date {
  const startOfDay = getStartOfDayParis(date)

  // Get day of week using Europe/Paris formatter
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
  })
  const dayName = formatter.format(startOfDay)

  // Map day names to offset from Monday
  const dayOffsets: Record<string, number> = {
    Mon: 0,
    Tue: -1,
    Wed: -2,
    Thu: -3,
    Fri: -4,
    Sat: -5,
    Sun: -6,
  }

  const offset = dayOffsets[dayName] ?? 0
  return addDaysParis(startOfDay, offset)
}

/**
 * Get date range for a period type in Europe/Paris timezone
 * CRITICAL: All boundaries are Europe/Paris calendar dates
 */
export function getVelocityPeriodDateRange(periodType: PeriodType): DateRange {
  const now = getNowInParis()

  switch (periodType) {
    case 'today':
      return {
        start: getStartOfDayParis(now),
        end: getEndOfDayParis(now),
      }

    case 'week':
      return {
        start: getStartOfWeekParis(now),
        end: getEndOfDayParis(now),
      }

    case 'month':
      return {
        start: getStartOfMonthParis(now),
        end: getEndOfDayParis(now),
      }

    case 'last30days': {
      const thirtyDaysAgo = addDaysParis(now, -30)
      return {
        start: getStartOfDayParis(thirtyDaysAgo),
        end: getEndOfDayParis(now),
      }
    }

    case 'last90days': {
      const ninetyDaysAgo = addDaysParis(now, -90)
      return {
        start: getStartOfDayParis(ninetyDaysAgo),
        end: getEndOfDayParis(now),
      }
    }

    case 'custom':
      // Default to month for custom (will be overridden by actual custom range)
      return {
        start: getStartOfMonthParis(now),
        end: getEndOfDayParis(now),
      }

    default:
      return {
        start: getStartOfMonthParis(now),
        end: getEndOfDayParis(now),
      }
  }
}
