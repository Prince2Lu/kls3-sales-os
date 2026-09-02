// Sorting utilities - null-safe comparison functions

import { normalizeSearchValue } from './search'

/**
 * Safely compares two string values for sorting (A-Z)
 * Handles undefined/null gracefully
 */
export function compareStringsAsc(a: unknown, b: unknown): number {
  const aStr = normalizeSearchValue(a)
  const bStr = normalizeSearchValue(b)
  return aStr.localeCompare(bStr, 'fr-FR')
}

/**
 * Safely compares two string values for sorting (Z-A)
 */
export function compareStringsDesc(a: unknown, b: unknown): number {
  return compareStringsAsc(b, a)
}

/**
 * Safely compares two numeric values (ascending)
 * Treats null/undefined as 0
 */
export function compareNumbersAsc(a: number | null | undefined, b: number | null | undefined): number {
  const aNum = a ?? 0
  const bNum = b ?? 0
  return aNum - bNum
}

/**
 * Safely compares two numeric values (descending)
 */
export function compareNumbersDesc(a: number | null | undefined, b: number | null | undefined): number {
  return compareNumbersAsc(b, a)
}

/**
 * Safely compares two date strings (ascending, earliest first)
 * Treats null/undefined as far future
 */
export function compareDatesAsc(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 0
  if (!a) return 1 // nulls last
  if (!b) return -1
  return new Date(a).getTime() - new Date(b).getTime()
}

/**
 * Safely compares two date strings (descending, latest first)
 */
export function compareDatesDesc(a: string | null | undefined, b: string | null | undefined): number {
  return compareDatesAsc(b, a)
}
