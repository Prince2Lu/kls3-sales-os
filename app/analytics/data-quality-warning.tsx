// Data quality warning (Phase 7B)
// Shows opportunities that reached RDV without Contacté stage history

interface DataQualityWarningProps {
  issueCount: number
}

export function DataQualityWarning({ issueCount }: DataQualityWarningProps) {
  if (issueCount === 0) {
    return null
  }

  return (
    <div className="bg-background-card border border-yellow-500/20 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-500/10 flex items-center justify-center mt-0.5">
          <span className="text-xs text-yellow-400">!</span>
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-yellow-400 mb-1">
            Qualité des données
          </div>
          <div className="text-xs text-text-muted">
            {issueCount} opportunité{issueCount > 1 ? 's ont' : ' a'} atteint RDV
            sans passage Contacté enregistré dans STAGE_HISTORY. Ces opportunités
            sont exclues de l'analyse de cohorte.
          </div>
        </div>
      </div>
    </div>
  )
}
