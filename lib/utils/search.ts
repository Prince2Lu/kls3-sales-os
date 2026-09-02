// Search utilities - null/undefined-safe string operations

/**
 * Safely normalizes a value for case-insensitive search.
 * Handles undefined, null, and non-string values gracefully.
 *
 * @param value - Any value (string, undefined, null, etc.)
 * @returns Lowercase string or empty string if value is not a string
 */
export function normalizeSearchValue(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : ''
}

/**
 * Safely combines multiple values into a searchable string.
 * Filters out falsy values before joining.
 *
 * @param values - Array of values to combine
 * @param separator - Separator to use when joining (default: space)
 * @returns Combined lowercase string
 */
export function combineSearchValues(values: unknown[], separator: string = ' '): string {
  return values
    .filter(Boolean)
    .map((v) => (typeof v === 'string' ? v : ''))
    .filter((s) => s.length > 0)
    .join(separator)
    .toLowerCase()
}
