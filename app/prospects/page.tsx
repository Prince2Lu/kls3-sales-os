// Prospects/Opportunities list page (Phase 2)

import { getOpportunities, getBusinessLines } from '@/lib/airtable'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default async function ProspectsPage() {
  const [opportunities, businessLines] = await Promise.all([
    getOpportunities({ maxRecords: 200 }),
    getBusinessLines(),
  ])

  // Create a map for quick business line lookup
  const blMap = Object.fromEntries(businessLines.map((bl) => [bl.id, bl]))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-syne">Prospects</h1>
          <p className="text-text-muted mt-2">
            {opportunities.length} opportunité{opportunities.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/prospects/new">
          <Button>+ Nouveau prospect</Button>
        </Link>
      </div>

      {opportunities.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <p className="text-text-muted text-lg">Aucun prospect pour le moment</p>
            <Link href="/prospects/new">
              <Button>Créer le premier prospect</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opportunity) => {
            const businessLine = blMap[opportunity.businessLineId]

            return (
              <Link key={opportunity.id} href={`/prospects/${opportunity.id}`}>
                <Card className="hover:border-accent/50 transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg">{opportunity.name}</h3>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="default">{opportunity.stage}</Badge>
                          {businessLine && (
                            <Badge variant="accent">{businessLine.name}</Badge>
                          )}
                          {opportunity.priority && (
                            <Badge
                              variant={
                                opportunity.priority === 'URGENT' ||
                                opportunity.priority === 'HIGH'
                                  ? 'accent'
                                  : 'muted'
                              }
                            >
                              {opportunity.priority}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {opportunity.problem && (
                        <p className="text-text-muted text-sm line-clamp-2">
                          {opportunity.problem}
                        </p>
                      )}
                    </div>

                    <div className="text-right space-y-2">
                      {opportunity.potentialValue && (
                        <div className="text-lg font-semibold">
                          {opportunity.potentialValue.toLocaleString('fr-FR')} €
                        </div>
                      )}
                      <div className="text-text-muted text-xs">
                        {opportunity.owner}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
