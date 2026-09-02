// Faceted filtering utilities
// Computes available filter options based on other active filters

/**
 * Applies a subset of filters to records, excluding the facet being computed
 *
 * @param records - All records to filter
 * @param activeFilters - Object containing all active filter values
 * @param excludeKey - The filter key to exclude when applying filters
 * @param applyFilter - Function that applies a single filter to records
 */
export function applyFiltersExcept<T, K extends keyof T>(
  records: T[],
  activeFilters: Record<string, string>,
  excludeKey: string,
  applyFilter: (records: T[], key: string, value: string) => T[]
): T[] {
  let result = [...records]

  for (const [key, value] of Object.entries(activeFilters)) {
    // Skip empty values and the excluded facet
    if (!value || key === excludeKey) continue

    result = applyFilter(result, key, value)
  }

  return result
}

/**
 * Extracts unique non-empty string values from records
 */
export function extractUniqueValues<T>(
  records: T[],
  accessor: (record: T) => string | undefined | null
): string[] {
  const values = new Set<string>()

  records.forEach((record) => {
    const value = accessor(record)
    if (value) {
      values.add(value)
    }
  })

  return Array.from(values).sort()
}

/**
 * Extracts unique values from array fields (for Business Lines)
 */
export function extractUniqueArrayValues<T>(
  records: T[],
  accessor: (record: T) => string[]
): string[] {
  const values = new Set<string>()

  records.forEach((record) => {
    const arrayValues = accessor(record)
    arrayValues.forEach((val) => values.add(val))
  })

  return Array.from(values).sort()
}

/**
 * Checks if a selected value is still valid in the current filtered context
 */
export function isValueStillValid(
  selectedValue: string,
  validOptions: string[]
): boolean {
  if (!selectedValue) return true
  return validOptions.includes(selectedValue)
}
