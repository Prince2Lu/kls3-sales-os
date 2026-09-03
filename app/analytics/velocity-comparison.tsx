// Velocity Business Line comparison (Phase 7C)
// Compare median cycle times across Business Lines (shown when BL filter = "Toutes")

import type { BusinessLineVelocityMetrics } from '@/lib/utils/velocity-analytics'
import { formatDuration } from '@/lib/utils/velocity-analytics'

interface VelocityComparisonProps {
  comparison: BusinessLineVelocityMetrics[]
}

export function VelocityComparison({ comparison }: VelocityComparisonProps) {
  // Filter out BLs with no data at all
  const validComparison = comparison.filter(
    (bl) =>
      bl.sampleSizes.contacteToRdv > 0 ||
      bl.sampleSizes.rdvToProposition > 0 ||
      bl.sampleSizes.propositionToGagne > 0 ||
      bl.sampleSizes.contacteToGagne > 0
  )

  if (validComparison.length === 0) {
    return null // Don't show comparison if no data
  }

  return (
    <div className="bg-background-card border border-border-light rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-light">
        <h3 className="text-lg font-semibold text-text-primary font-syne">
          Comparaison Business Lines
        </h3>
        <p className="text-sm text-text-muted mt-1">
          Temps médian par transition et par Business Line
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-light">
              <th className="text-left px-6 py-3 text-xs uppercase tracking-wider text-text-muted font-medium">
                Business Line
              </th>
              <th className="text-right px-6 py-3 text-xs uppercase tracking-wider text-text-muted font-medium">
                Contacté → RDV
              </th>
              <th className="text-right px-6 py-3 text-xs uppercase tracking-wider text-text-muted font-medium">
                RDV → Proposition
              </th>
              <th className="text-right px-6 py-3 text-xs uppercase tracking-wider text-text-muted font-medium">
                Proposition → Gagné
              </th>
              <th className="text-right px-6 py-3 text-xs uppercase tracking-wider text-text-muted font-medium">
                Contacté → Gagné
              </th>
            </tr>
          </thead>
          <tbody>
            {validComparison.map((bl, index) => (
              <tr
                key={bl.businessLineId}
                className={
                  index !== validComparison.length - 1
                    ? 'border-b border-border-light'
                    : ''
                }
              >
                <td className="px-6 py-4 text-text-primary font-medium">
                  {bl.businessLineName}
                </td>
                <td className="px-6 py-4 text-right text-text-primary">
                  <div>{formatDuration(bl.contacteToRdv)}</div>
                  {bl.sampleSizes.contacteToRdv > 0 && (
                    <div className="text-xs text-text-muted mt-1">
                      n={bl.sampleSizes.contacteToRdv}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-text-primary">
                  <div>{formatDuration(bl.rdvToProposition)}</div>
                  {bl.sampleSizes.rdvToProposition > 0 && (
                    <div className="text-xs text-text-muted mt-1">
                      n={bl.sampleSizes.rdvToProposition}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-text-primary">
                  <div>{formatDuration(bl.propositionToGagne)}</div>
                  {bl.sampleSizes.propositionToGagne > 0 && (
                    <div className="text-xs text-text-muted mt-1">
                      n={bl.sampleSizes.propositionToGagne}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-text-primary">
                  <div>{formatDuration(bl.contacteToGagne)}</div>
                  {bl.sampleSizes.contacteToGagne > 0 && (
                    <div className="text-xs text-text-muted mt-1">
                      n={bl.sampleSizes.contacteToGagne}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="px-6 py-3 bg-background-primary border-t border-border-light">
        <p className="text-xs text-text-muted/60">
          Seules les transitions avec données sont affichées. n = taille
          échantillon.
        </p>
      </div>
    </div>
  )
}
