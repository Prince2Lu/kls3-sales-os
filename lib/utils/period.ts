// Period utilities for Dashboard filtering
// Handles period-based date filtering with explicit Europe/Paris timezone handling

export type PeriodType = 'today' | 'week' | 'month' | 'custom'

export interface DateRange {
  start: Date
  end: Date
}

/**
 * Get start of day in local time
 */
function getStartOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get end of day in local time
 */
function getEndOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Get start of week (Monday) in local time
 */
function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get start of month in local time
 */
function getStartOfMonth(date: Date): Date {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get date range for a period type
 */
export function getPeriodDateRange(periodType: PeriodType): DateRange {
  const now = new Date()

  switch (periodType) {
    case 'today':
      return {
        start: getStartOfDay(now),
        end: getEndOfDay(now),
      }

    case 'week':
      return {
        start: getStartOfWeek(now),
        end: getEndOfDay(now),
      }

    case 'month':
      return {
        start: getStartOfMonth(now),
        end: getEndOfDay(now),
      }

    case 'custom':
      // Default to month for custom (will be overridden by actual custom range)
      return {
        start: getStartOfMonth(now),
        end: getEndOfDay(now),
      }

    default:
      return {
        start: getStartOfMonth(now),
        end: getEndOfDay(now),
      }
  }
}

/**
 * Check if a date string falls within a date range
 */
export function isInPeriod(dateString: string, range: DateRange): boolean {
  const date = new Date(dateString)
  return date >= range.start && date <= range.end
}

/**
 * Format period label for display
 */
export function formatPeriodLabel(periodType: PeriodType, customRange?: DateRange): string {
  switch (periodType) {
    case 'today':
      return "Aujourd'hui"
    case 'week':
      return 'Cette semaine'
    case 'month':
      return 'Ce mois'
    case 'custom':
      if (customRange) {
        return `${customRange.start.toLocaleDateString('fr-FR')} - ${customRange.end.toLocaleDateString('fr-FR')}`
      }
      return 'Personnalisé'
    default:
      return 'Ce mois'
  }
}
