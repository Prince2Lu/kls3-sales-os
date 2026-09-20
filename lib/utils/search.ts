// Search utilities - null/undefined-safe string operations

/**
 * Removes diacritics (accents) from a string using Unicode normalization.
 * Example: "Benoît" → "Benoit", "Café" → "Cafe"
 *
 * @param str - String to remove accents from
 * @returns String without diacritics
 */
function removeDiacritics(str: string): string {
  return str
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
}

/**
 * Safely normalizes a value for case-insensitive, accent-insensitive search.
 * Handles undefined, null, and non-string values gracefully.
 *
 * @param value - Any value (string, undefined, null, etc.)
 * @returns Lowercase string without accents, or empty string if value is not a string
 */
export function normalizeSearchValue(value: unknown): string {
  if (typeof value !== 'string') return ''
  return removeDiacritics(value.toLowerCase().trim())
}

/**
 * Safely combines multiple values into a searchable string.
 * Filters out falsy values before joining.
 *
 * @param values - Array of values to combine
 * @param separator - Separator to use when joining (default: space)
 * @returns Combined lowercase string without accents
 */
export function combineSearchValues(values: unknown[], separator: string = ' '): string {
  const combined = values
    .filter(Boolean)
    .map((v) => (typeof v === 'string' ? v : ''))
    .filter((s) => s.length > 0)
    .join(separator)
  return normalizeSearchValue(combined)
}

/**
 * Normalizes a phone number for search by removing visual separators.
 * Removes spaces, dots, dashes, parentheses, and other common separators.
 * Preserves + prefix for international numbers.
 *
 * Examples:
 * - "06 12 34 56 78" → "0612345678"
 * - "06.12.34.56.78" → "0612345678"
 * - "+33 6 12 34 56 78" → "+33612345678"
 *
 * @param value - Phone number string
 * @returns Normalized phone number or empty string
 */
export function normalizePhoneForSearch(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(/[\s.\-()]/g, '').toLowerCase()
}
