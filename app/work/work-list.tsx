'use client'

// Work List - displays filtered items as cards

import type {
  ColdCallTarget,
  Opportunity,
  BusinessLine,
  Company,
  Contact,
  Activity,
  Task,
  Owner,
} from '@/types/domain'
import { WorkCard } from './work-card'

type StatusType = 'PRE_RDV' | 'POST_RDV'

interface WorkListProps {
  items: (ColdCallTarget | Opportunity)[]
  businessLine: BusinessLine
  statusType: StatusType
  companiesMap: Record<string, Company>
  contactsMap: Record<string, Contact>
  blMap: Record<string, BusinessLine>
  activitiesByEntityId: Record<string, Activity[]>
  tasksByEntityId: Record<string, Task[]>
  currentOwner: Owner
}

export function WorkList({
  items,
  businessLine,
  statusType,
  companiesMap,
  contactsMap,
  blMap,
  activitiesByEntityId,
  tasksByEntityId,
  currentOwner,
}: WorkListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        <p>Aucune cible dans ce bloc</p>
        <p className="text-xs mt-2">Modifiez les filtres pour voir d'autres résultats</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Count header */}
      <div className="flex items-center justify-between px-3">
        <h3 className="font-semibold text-sm text-text-muted">
          {items.length} cible{items.length > 1 ? 's' : ''}
        </h3>
      </div>

      {/* Cards list - vertical stack, responsive grid on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          // Get company (handle null companyId from Opportunities)
          const company = item.companyId ? companiesMap[item.companyId] : undefined

          // Get contact based on item type
          let contact: Contact | null = null
          if ('contactId' in item && item.contactId) {
            contact = contactsMap[item.contactId] || null
          } else if ('primaryContactId' in item && item.primaryContactId) {
            contact = contactsMap[item.primaryContactId] || null
          }

          const activities = activitiesByEntityId[item.id] || []
          const tasks = tasksByEntityId[item.id] || []

          return (
            <WorkCard
              key={item.id}
              item={item}
              company={company}
              contact={contact}
              businessLine={businessLine}
              activities={activities}
              tasks={tasks}
              statusType={statusType}
              currentOwner={currentOwner}
            />
          )
        })}
      </div>
    </div>
  )
}
