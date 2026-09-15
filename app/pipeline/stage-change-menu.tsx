'use client'

// Quick stage change menu for opportunities

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { Stage } from '@/types/domain'

interface StageChangeMenuProps {
  onSelect: (stage: Stage) => void
  onCancel: () => void
  currentStage: Stage
  stages: readonly Stage[]
}

export function StageChangeMenu({
  onSelect,
  onCancel,
  currentStage,
  stages,
}: StageChangeMenuProps) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="max-w-sm w-full p-4 space-y-3">
        <div>
          <h3 className="text-lg font-bold font-syne">Changer le stage</h3>
          <p className="text-xs text-text-muted mt-1">
            Stage actuel : {currentStage}
          </p>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {stages.map((stage) => (
            <Button
              key={stage}
              onClick={() => onSelect(stage)}
              variant={stage === currentStage ? 'primary' : 'ghost'}
              className="w-full justify-start"
              disabled={stage === currentStage}
            >
              {stage}
            </Button>
          ))}
        </div>

        <Button onClick={onCancel} variant="ghost" className="w-full">
          Annuler
        </Button>
      </Card>
    </div>
  )
}
