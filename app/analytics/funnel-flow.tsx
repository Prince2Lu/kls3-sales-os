// Funnel Activity visualization (Phase 7A)
// Horizontal compact display of stage volumes (no conversion ratios)

import type { StageVolume } from '@/lib/utils/funnel-analytics'

interface FunnelFlowProps {
  volumes: StageVolume[]
}

export function FunnelFlow({ volumes }: FunnelFlowProps) {
  return (
    <div className="bg-background-card border border-white/[0.07] rounded-2xl p-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-7 h-[1px] bg-accent" />
        <h2 className="text-xs uppercase tracking-[0.16em] text-accent font-medium">
          Activité Funnel
        </h2>
      </div>

      {/* Horizontal Funnel Flow - Desktop */}
      <div className="hidden md:flex items-center justify-between gap-3">
        {volumes.map((volume, index) => {
          const isLast = index === volumes.length - 1

          return (
            <div key={volume.stage} className="flex items-center gap-3">
              {/* Stage Card */}
              <div className="flex flex-col items-center text-center min-w-[100px]">
                <div className="text-3xl font-bold text-text-primary font-syne mb-1">
                  {volume.count}
                </div>
                <div className="text-xs text-text-muted leading-tight">
                  {volume.stage}
                  {volume.count > 1 ? 's' : ''}
                </div>
              </div>

              {/* Arrow */}
              {!isLast && (
                <div className="text-text-muted/30 text-lg flex-shrink-0">
                  →
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Vertical Funnel Flow - Mobile */}
      <div className="md:hidden space-y-3">
        {volumes.map((volume, index) => {
          const isLast = index === volumes.length - 1

          return (
            <div key={volume.stage}>
              <div className="flex items-center justify-between p-3 bg-background-primary/30 rounded-xl">
                <div className="text-sm text-text-muted">
                  {volume.stage}
                  {volume.count > 1 ? 's' : ''}
                </div>
                <div className="text-2xl font-bold text-text-primary font-syne">
                  {volume.count}
                </div>
              </div>
              {!isLast && (
                <div className="flex justify-center py-1">
                  <div className="text-text-muted/30">↓</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {volumes.every((v) => v.count === 0) && (
        <div className="text-center py-8 text-text-muted">
          <p>Aucune activité dans le funnel pour cette période</p>
        </div>
      )}
    </div>
  )
}
