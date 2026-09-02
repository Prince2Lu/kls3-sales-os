// Timezone utilities for KLS3 Sales OS
// Explicit Europe/Paris timezone handling for all business operations
// CRITICAL: Deterministic timezone-safe operations using Intl API

const PARIS_TZ = 'Europe/Paris'

type ParisComponents = {
  year: number
  month: number
  day: number
  hours: number
  minutes: number
  seconds: number
  ms: number
}

const parisFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: PARIS_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/**
 * Get current date/time as an instant.
 * Date itself has no timezone; Paris semantics are applied by the helpers below.
 */
export function getNowInParis(): Date {
  return new Date()
}

/**
 * Convert an instant to its Europe/Paris calendar components.
 * This is independent of the runtime/system timezone.
 */
function getParisComponents(date: Date): ParisComponents {
  const parts = parisFormatter.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0)

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hours: get('hour'),
    minutes: get('minute'),
    seconds: get('second'),
    ms: date.getUTCMilliseconds(),
  }
}

/**
 * Represent calendar components as a timezone-neutral UTC wall-clock timestamp.
 * Used only to compare calendar values, never as the final business instant.
 */
function componentsAsUtcMs(components: ParisComponents): number {
  return Date.UTC(
    components.year,
    components.month - 1,
    components.day,
    components.hours,
    components.minutes,
    components.seconds,
    components.ms
  )
}

/**
 * Get the Europe/Paris UTC offset at a concrete instant.
 * Example: +60 in CET, +120 in CEST.
 */
function getParisOffsetMinutes(date: Date): number {
  const parisWallClockMs = componentsAsUtcMs(getParisComponents(date))
  return (parisWallClockMs - date.getTime()) / (60 * 1000)
}

/**
 * Create the UTC instant corresponding to a given local Europe/Paris date/time.
 *
 * The conversion is solved from the real IANA timezone offset returned by Intl.
 * No assumptions such as "month = 30 days" or "year = 365 days" are used.
 */
function createDateInParis(
  year: number,
  month: number,
  day: number,
  hours: number = 0,
  minutes: number = 0,
  seconds: number = 0,
  ms: number = 0
): Date {
  const target: ParisComponents = {
    year,
    month,
    day,
    hours,
    minutes,
    seconds,
    ms,
  }
  const targetWallClockMs = componentsAsUtcMs(target)

  // Gather the real Paris offsets around the requested wall-clock time.
  // Sampling both sides of the target captures CET/CEST changes without any
  // dependency on the runtime timezone.
  const offsets = new Set<number>()
  for (const deltaHours of [-48, -24, -12, 0, 12, 24, 48]) {
    const probe = new Date(targetWallClockMs + deltaHours * 60 * 60 * 1000)
    offsets.add(getParisOffsetMinutes(probe))
  }

  const candidates = [...offsets].map((offsetMinutes) => {
    const instant = new Date(targetWallClockMs - offsetMinutes * 60 * 1000)
    const actual = getParisComponents(instant)
    return {
      instant,
      actual,
      wallClockDeltaMs: componentsAsUtcMs(actual) - targetWallClockMs,
    }
  })

  // Normal case, and autumn overlap: one or two instants can represent the
  // requested local time. Choose the earlier instant for deterministic
  // "compatible" disambiguation.
  const exact = candidates
    .filter(({ wallClockDeltaMs }) => wallClockDeltaMs === 0)
    .sort((a, b) => a.instant.getTime() - b.instant.getTime())

  if (exact.length > 0) return exact[0].instant

  // Spring DST gap: the requested local wall-clock time does not exist.
  // Shift forward by the DST gap (Temporal/Date-style compatible behavior)
  // instead of throwing and breaking analytics.
  const afterGap = candidates
    .filter(({ wallClockDeltaMs }) => wallClockDeltaMs > 0)
    .sort((a, b) => a.wallClockDeltaMs - b.wallClockDeltaMs)

  if (afterGap.length > 0) return afterGap[0].instant

  throw new RangeError(
    `Unable to resolve Europe/Paris local time: ${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
  )
}

/** Get start of day (00:00:00.000) in Europe/Paris. */
export function getStartOfDayParis(date: Date): Date {
  const paris = getParisComponents(date)
  return createDateInParis(paris.year, paris.month, paris.day, 0, 0, 0, 0)
}

/** Get end of day (23:59:59.999) in Europe/Paris. */
export function getEndOfDayParis(date: Date): Date {
  const paris = getParisComponents(date)
  return createDateInParis(paris.year, paris.month, paris.day, 23, 59, 59, 999)
}

/** Get start of month in Europe/Paris. */
export function getStartOfMonthParis(date: Date): Date {
  const paris = getParisComponents(date)
  return createDateInParis(paris.year, paris.month, 1, 0, 0, 0, 0)
}

/** Get end of month in Europe/Paris. */
export function getEndOfMonthParis(date: Date): Date {
  const paris = getParisComponents(date)
  const lastDay = new Date(Date.UTC(paris.year, paris.month, 0)).getUTCDate()

  return createDateInParis(paris.year, paris.month, lastDay, 23, 59, 59, 999)
}

/**
 * Add calendar days in Europe/Paris, preserving the local wall-clock time.
 * Example: 10 Mar 2026 09:00 Paris + 30 days = 9 Apr 2026 09:00 Paris,
 * even though the DST offset changes between those dates.
 */
export function addDaysParis(date: Date, days: number): Date {
  const paris = getParisComponents(date)

  // UTC is used only as a timezone-neutral calendar arithmetic engine.
  const calendarDate = new Date(Date.UTC(paris.year, paris.month - 1, paris.day + days))

  return createDateInParis(
    calendarDate.getUTCFullYear(),
    calendarDate.getUTCMonth() + 1,
    calendarDate.getUTCDate(),
    paris.hours,
    paris.minutes,
    paris.seconds,
    paris.ms
  )
}

/**
 * Subtract calendar months in Europe/Paris, preserving local time and clamping
 * the day to the last valid day of the target month (e.g. 31 Mar - 1 month = 28 Feb in 2026).
 */
export function subtractMonthsParis(date: Date, months: number): Date {
  const paris = getParisComponents(date)
  const targetMonthIndex = paris.year * 12 + (paris.month - 1) - months
  const targetYear = Math.floor(targetMonthIndex / 12)
  const targetMonthZeroBased = ((targetMonthIndex % 12) + 12) % 12
  const targetMonth = targetMonthZeroBased + 1
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate()
  const targetDay = Math.min(paris.day, lastDay)

  return createDateInParis(
    targetYear,
    targetMonth,
    targetDay,
    paris.hours,
    paris.minutes,
    paris.seconds,
    paris.ms
  )
}

/**
 * Normalize an instant through Europe/Paris calendar components.
 * For a valid Date this represents the same instant, independent of runtime TZ.
 */
export function toParisDate(date: Date): Date {
  const paris = getParisComponents(date)
  return createDateInParis(
    paris.year,
    paris.month,
    paris.day,
    paris.hours,
    paris.minutes,
    paris.seconds,
    paris.ms
  )
}
