// Date utilities for KLS3 Sales OS
// Handles timezone-safe date comparisons for operational tasks

/**
 * Get the start of today in local time (00:00:00)
 * Used to determine if tasks are overdue, due today, or future
 */
export function getStartOfToday(): Date {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

/**
 * Get the end of today in local time (23:59:59.999)
 */
export function getEndOfToday(): Date {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  return now
}

/**
 * Check if a date string is before today (overdue)
 */
export function isOverdue(dateString: string): boolean {
  const date = new Date(dateString)
  const startOfToday = getStartOfToday()
  return date < startOfToday
}

/**
 * Check if a date string is today
 */
export function isToday(dateString: string): boolean {
  const date = new Date(dateString)
  const startOfToday = getStartOfToday()
  const endOfToday = getEndOfToday()
  return date >= startOfToday && date <= endOfToday
}

/**
 * Check if a date string is in the future (after today)
 */
export function isFuture(dateString: string): boolean {
  const date = new Date(dateString)
  const endOfToday = getEndOfToday()
  return date > endOfToday
}

/**
 * Format date for French display
 * Example: "mardi 2 septembre 2026"
 */
export function formatFrenchDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Format time for French display
 * Example: "14:30"
 */
export function formatFrenchTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format overdue display with relative date
 * Example: "En retard depuis hier · 10:00"
 * Example: "En retard depuis 3 jours · 14:30"
 */
export function formatOverdueDisplay(dateString: string): string {
  const date = new Date(dateString)
  const time = formatFrenchTime(date)

  const startOfToday = getStartOfToday()
  const daysAgo = Math.floor((startOfToday.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (daysAgo === 1) {
    return `En retard depuis hier · ${time}`
  } else if (daysAgo > 1) {
    return `En retard depuis ${daysAgo} jours · ${time}`
  } else {
    return `En retard · ${time}`
  }
}
