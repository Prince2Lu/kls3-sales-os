// Continuer la prospection section
// Displays work block counters with links to /work mode

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { BusinessLine, Owner, CallStatus, Stage } from '@/types/domain'

interface WorkBlock {
  businessLine: BusinessLine
  status: CallStatus | Stage
  count: number
  statusType: 'PRE_RDV' | 'POST_RDV'
}

interface WorkBlocksSectionProps {
  workBlocks: WorkBlock[]
  currentOwner: Owner
}

export function WorkBlocksSection({
  workBlocks,
  currentOwner,
}: WorkBlocksSectionProps) {
  if (workBlocks.length === 0) {
    return null
  }

  // Group by business line
  const blocksByBusinessLine: Record<string, WorkBlock[]> = {}
  workBlocks.forEach((block) => {
    const blName = block.businessLine.name
    if (!blocksByBusinessLine[blName]) {
      blocksByBusinessLine[blName] = []
    }
    blocksByBusinessLine[blName].push(block)
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          Continuer la prospection
        </CardTitle>
        <p className="text-xs text-text-muted mt-1">
          Blocs de travail disponibles
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(blocksByBusinessLine).map(([blName, blocks]) => {
            const businessLine = blocks[0].businessLine

            return (
              <div key={businessLine.id} className="space-y-2">
                {/* Business Line name */}
                <div className="font-medium text-sm">{blName}</div>

                {/* Work blocks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {blocks.map((block) => {
                    const url = `/work?bl=${encodeURIComponent(
                      businessLine.code
                    )}&status=${encodeURIComponent(block.status)}&owner=${encodeURIComponent(
                      currentOwner
                    )}`

                    return (
                      <Link key={block.status} href={url}>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent transition-all bg-card-bg hover:bg-accent/5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{block.status}</span>
                            {block.statusType === 'PRE_RDV' && (
                              <Badge variant="muted" className="text-xs">
                                Prospection
                              </Badge>
                            )}
                          </div>
                          <Badge variant="accent">{block.count}</Badge>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
