// Minimal RFC 4180 CSV reader for "Sales OS friendly" imports (Trello #58).
// Handles quotes, escaped quotes, CRLF, a UTF-8 BOM, and ; , or tab separators.

export type CsvTable = { headers: string[]; rows: Record<string, string>[] }

export function detectDelimiter(firstLine: string): string {
  const counts = [';', ',', '\t'].map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length - 1 }))
  return counts.sort((a, b) => b.count - a.count)[0].count > 0 ? counts[0].delimiter : ','
}

export function parseCsv(input: string): CsvTable {
  const text = input.replace(/^﻿/, '')
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = detectDelimiter(firstLine)
  const records: string[][] = []
  let field = ''
  let record: string[] = []
  let quoted = false

  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index++ }
      else if (char === '"') quoted = false
      else field += char
      continue
    }
    if (char === '"' && field === '') quoted = true
    else if (char === delimiter) { record.push(field); field = '' }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index++
      record.push(field); records.push(record); record = []; field = ''
    } else field += char
  }
  if (field !== '' || record.length) { record.push(field); records.push(record) }

  const nonEmpty = records.filter((row) => row.some((value) => value.trim() !== ''))
  const headers = (nonEmpty.shift() ?? []).map((header) => header.trim())
  const rows = nonEmpty.map((values) =>
    Object.fromEntries(headers.map((header, column) => [header, (values[column] ?? '').trim()])))
  return { headers, rows }
}
