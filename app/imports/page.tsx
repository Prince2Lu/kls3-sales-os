import { getImportBatches } from '@/lib/airtable'
import { ImportClient } from './import-client'

export default async function ImportsPage() {
  const [lastImport] = await getImportBatches({ maxRecords: 1 })
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-syne">Ajouter des prospects</h1>
        <p className="mt-2 text-muted-foreground">Import progressif et contrôlé des offices notariaux.</p>
      </div>
      <ImportClient lastImport={lastImport ?? null} />
    </div>
  )
}
