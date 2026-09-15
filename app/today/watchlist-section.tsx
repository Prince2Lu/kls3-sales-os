// À surveiller section - Hot opportunities needing attention
// Displays opportunities in advanced stages without recent activity

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Opportunity, BusinessLine, Company, Contact } from '@/types/domain'

interface WatchlistSectionProps {
  opportunities: Opportunity[]
  businessLineMap: Record<string, BusinessLine>
  companyMap: Record<string, Company>
  contactMap: Record<string, Contact>
  daysSinceActivityMap: Record<string, number>
}

export function WatchlistSection({
  opportunities,
  businessLineMap,
  companyMap,
  contactMap,
  daysSinceActivityMap,
}: WatchlistSectionProps) {
  if (opportunities.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          À surveiller ({opportunities.length})
        </CardTitle>
        <p className="text-xs text-text-muted mt-1">
          Opportunités avancées sans activité récente
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {opportunities.map((opportunity) => {
            const businessLine = opportunity.businessLineId
              ? businessLineMap[opportunity.businessLineId]
              : undefined
            const company = opportunity.companyId
              ? companyMap[opportunity.companyId]
              : undefined
            const contact = opportunity.primaryContactId
              ? contactMap[opportunity.primaryContactId]
              : undefined
            const daysSince = daysSinceActivityMap[opportunity.id] || 0

            return (
              <Card
                key={opportunity.id}
                className="p-4 border-orange-500/30 bg-orange-500/5"
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div>
                        <Link
                          href={`/prospects/${opportunity.id}`}
                          className="text-accent hover:underline font-medium"
                        >
                          {opportunity.name}
                        </Link>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="default">{opportunity.stage}</Badge>
                        {businessLine && (
                          <Badge variant="muted" className="text-xs">
                            {businessLine.name}
                          </Badge>
                        )}
                      </div>

                      {/* Reason for attention */}
                      <div className="text-xs text-orange-600 dark:text-orange-400">
                        {opportunity.stage} · aucune action depuis {daysSince} jour
                        {daysSince > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Context */}
                  <div className="space-y-1 text-sm">
                    {company && (
                      <div className="text-text-muted">
                        <span className="text-xs">Entreprise:</span> {company.name}
                      </div>
                    )}

                    {contact && (
                      <div className="text-text-muted">
                        <span className="text-xs">Contact:</span>{' '}
                        {contact.firstName} {contact.lastName}
                      </div>
                    )}

                    {opportunity.potentialValue && (
                      <div className="text-accent font-semibold text-sm">
                        {opportunity.potentialValue.toLocaleString('fr-FR')} €
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <div className="flex gap-2">
                    <Link href={`/prospects/${opportunity.id}/task`}>
                      <Button size="sm" className="text-xs">
                        Planifier une action
                      </Button>
                    </Link>
                    <Link href={`/prospects/${opportunity.id}`}>
                      <Button size="sm" variant="ghost" className="text-xs">
                        Voir le dossier
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
