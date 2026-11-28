import { getBusinessLines, getImportBatches } from '@/lib/airtable'
import { ImportClient } from './import-client'
import { CsvImportClient } from './csv-import-client'
import { isNotaryImportEnabled } from '@/lib/prospecting/safety'

// A CSV batch writes up to ~400 Airtable records at ~5 requests/s.
export const maxDuration = 300

export default async function ImportsPage() {
  const [[lastImport], businessLines] = await Promise.all([
    getImportBatches({ maxRecords: 1 }),
    getBusinessLines(),
  ])
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold font-syne">Ajouter des prospects</h1>
        <p className="mt-2 text-muted-foreground">Import CSV contrôlé et import progressif des offices notariaux.</p>
      </div>
      <CsvImportClient businessLines={businessLines.filter((line) => line.active)} />
      <ImportClient lastImport={lastImport ?? null} importEnabled={isNotaryImportEnabled()} />
    </div>
  )
}
