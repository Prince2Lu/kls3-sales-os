// Today's tasks section (Phase 4)

import { getOpportunities, getCompanies, getContacts } from '@/lib/airtable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { Task, BusinessLine } from '@/types/domain'
import { TaskCard } from './task-card'

interface TodayTasksSectionProps {
  tasks: Task[]
  businessLineMap: Record<string, BusinessLine>
}

export async function TodayTasksSection({
  tasks,
  businessLineMap,
}: TodayTasksSectionProps) {
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

  // Sort by priority then due date
  const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  const sortedTasks = [...tasks].sort((a, b) => {
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4

    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }

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
          À faire aujourd'hui ({tasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-text-muted text-sm">Rien de prévu aujourd'hui.</p>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task) => {
              const opportunity = task.opportunityId
                ? opportunityMap[task.opportunityId]
                : undefined
              const company =
                opportunity?.companyId
                  ? companyMap[opportunity.companyId]
                  : undefined
              const contact = task.contactId
                ? contactMap[task.contactId]
                : undefined
              const businessLine = opportunity?.businessLineId
                ? businessLineMap[opportunity.businessLineId]
                : undefined

              return (
                <TaskCard
                  key={task.id}
                  task={task}
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
