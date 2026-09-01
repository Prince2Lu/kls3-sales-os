// Opportunities without next action section (Phase 4)

import { getCompanies, getContacts } from '@/lib/airtable'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Opportunity, BusinessLine } from '@/types/domain'

interface NoNextActionSectionProps {
  opportunities: Opportunity[]
  businessLineMap: Record<string, BusinessLine>
}

export async function NoNextActionSection({
  opportunities,
  businessLineMap,
}: NoNextActionSectionProps) {
  // Fetch related data
  const [companies, contacts] = await Promise.all([
    getCompanies({ maxRecords: 500 }),
    getContacts({ maxRecords: 500 }),
  ])

  // Create lookup maps
  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c]))
  const contactMap = Object.fromEntries(contacts.map((c) => [c.id, c]))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          Sans prochaine action ({opportunities.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {opportunities.length === 0 ? (
          <p className="text-text-muted text-sm">
            Toutes les opportunités actives ont une prochaine action.
          </p>
        ) : (
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

              return (
                <Card
                  key={opportunity.id}
                  className="p-4 border-yellow-500/30 bg-yellow-500/5"
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
                    <div>
                      <Link href={`/prospects/${opportunity.id}/task`}>
                        <Button size="sm" className="text-xs">
                          Planifier une action
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
