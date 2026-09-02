// Business Line Detail component (Phase 7A)
// Displayed when a specific Business Line is selected

import type { StageVolume } from '@/lib/utils/funnel-analytics'
import type { BusinessLine } from '@/types/domain'

interface BusinessLineDetailProps {
  businessLine: BusinessLine | null
  volumes: StageVolume[]
}

export function BusinessLineDetail({
  businessLine,
  volumes,
}: BusinessLineDetailProps) {
  if (!businessLine) {
    return null
  }

  return (
    <div className="bg-background-card border border-white/[0.07] rounded-2xl p-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-7 h-[1px] bg-accent" />
        <h2 className="text-xs uppercase tracking-[0.16em] text-accent font-medium">
          Détail {businessLine.name}
        </h2>
      </div>

      {/* Detailed Volume Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07]">
              <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-text-muted font-medium">
                Étape
              </th>
              <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-text-muted font-medium">
                Volume
              </th>
            </tr>
          </thead>
          <tbody>
            {volumes.map((volume) => (
              <tr
                key={volume.stage}
                className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="font-medium text-text-primary">
                    {volume.stage}
                  </div>
                </td>
                <td className="text-right py-4 px-4">
                  <div className="text-lg font-semibold text-text-primary font-syne">
                    {volume.count}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {volumes.every((v) => v.count === 0) && (
        <div className="text-center py-8 text-text-muted">
          <p>Aucune activité pour cette Business Line sur la période</p>
        </div>
      )}

      {/* Explanation */}
      <div className="mt-6 p-4 bg-accent/5 border border-accent/20 rounded-xl">
        <p className="text-xs text-text-muted leading-relaxed">
          Vue détaillée des volumes du funnel pour {businessLine.name} sur la période sélectionnée.
        </p>
      </div>
    </div>
  )
}
