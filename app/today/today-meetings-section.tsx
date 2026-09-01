// Today's meetings section (Phase 4)

import { getOpportunities, getCompanies, getContacts } from '@/lib/airtable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { Task, BusinessLine } from '@/types/domain'
import { TaskCard } from './task-card'

interface TodayMeetingsSectionProps {
  meetings: Task[]
  businessLineMap: Record<string, BusinessLine>
}

export async function TodayMeetingsSection({
  meetings,
  businessLineMap,
}: TodayMeetingsSectionProps) {
  // Fetch related data
  const [opportunities, companies, contacts] = await Promise.all([
    getOpportunities({ maxRecords: 500 }),
    getCompanies({ maxRecords: 500 }),
    getContacts({ maxRecords: 500 }),
  ])

  // Create lookup maps
  const opportunityMap = Object.fromEntries(
    opportunities.map((opp) => [opp.id, opp])
  )
  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c]))
  const contactMap = Object.fromEntries(contacts.map((c) => [c.id, c]))

  // Sort by time
  const sortedMeetings = [...meetings].sort((a, b) => {
    if (a.dueAt && b.dueAt) {
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
    }
    return 0
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          RDV aujourd'hui ({meetings.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {meetings.length === 0 ? (
          <p className="text-text-muted text-sm">Aucun RDV prévu.</p>
        ) : (
          <div className="space-y-3">
            {sortedMeetings.map((meeting) => {
              const opportunity = meeting.opportunityId
                ? opportunityMap[meeting.opportunityId]
                : undefined
              const company =
                opportunity?.companyId
                  ? companyMap[opportunity.companyId]
                  : undefined
              const contact = meeting.contactId
                ? contactMap[meeting.contactId]
                : undefined
              const businessLine = opportunity?.businessLineId
                ? businessLineMap[opportunity.businessLineId]
                : undefined

              return (
                <TaskCard
                  key={meeting.id}
                  task={meeting}
                  businessLine={businessLine}
                  opportunityName={opportunity?.name}
                  companyName={company?.name}
                  contactName={
                    contact
                      ? `${contact.firstName} ${contact.lastName}`
                      : undefined
                  }
                />
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
