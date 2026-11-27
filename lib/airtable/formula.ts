// Safe string literal for Airtable formulas (filterByFormula).
// Never interpolate a raw value into a formula: a quote in an email, a name or
// a URL parameter would change the formula (formula injection).

export function formulaString(value: string | number | null | undefined): string {
  const text = String(value ?? '')
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ')}"`
}
