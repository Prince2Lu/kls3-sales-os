import {
  getTasks,
  getOpportunities,
  getCompanies,
  getContacts,
  getBusinessLines,
  getColdCallTargets,
} from '@/lib/airtable'
import { PlanningClient } from './planning-client'

export default async function PlanningPage() {
  const [tasks, opportunities, companies, contacts, businessLines, targets] =
    await Promise.all([
      getTasks({ status: 'TODO' }),
      getOpportunities(),
      getCompanies(),
      getContacts(),
      getBusinessLines(),
      getColdCallTargets({ includeArchived: true }),
    ])

  const opportunityMap = new Map(opportunities.map((item) => [item.id, item]))
  const companyMap = new Map(companies.map((item) => [item.id, item]))
  const contactMap = new Map(contacts.map((item) => [item.id, item]))
  const businessLineMap = new Map(businessLines.map((item) => [item.id, item]))
  const targetMap = new Map(targets.map((item) => [item.id, item]))

  const items = tasks
    .filter((task) => Boolean(task.dueAt))
    .map((task) => {
      const opportunity = task.opportunityId
        ? opportunityMap.get(task.opportunityId)
        : undefined
      const target = task.coldCallTargetId
        ? targetMap.get(task.coldCallTargetId)
        : undefined
      const contact = task.contactId
        ? contactMap.get(task.contactId)
        : undefined

      const companyId =
        opportunity?.companyId || target?.companyId || contact?.companyId || null
      const businessLineId =
        opportunity?.businessLineId || target?.businessLineId || null
      const company = companyId ? companyMap.get(companyId) : undefined
      const businessLine = businessLineId
        ? businessLineMap.get(businessLineId)
        : undefined

      return {
        id: task.id,
        dueAt: task.dueAt!,
        type: task.type,
        owner: task.owner,
        priority: task.priority,
        notes: task.notes,
        companyId,
        companyName: company?.name || null,
        contactId: contact?.id || null,
        contactName: contact
          ? [contact.firstName, contact.lastName].filter(Boolean).join(' ')
          : null,
        opportunityId: opportunity?.id || null,
        opportunityName: opportunity?.name || null,
        businessLineId,
        businessLineName: businessLine?.name || null,
        href: opportunity
          ? `/prospects/${opportunity.id}/task/${task.id}`
          : companyId
            ? `/companies/${companyId}`
            : '/today',
      }
    })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold font-syne">Planning</h1>
        <p className="text-text-muted mt-2">
          Vue globale des tâches et rendez-vous commerciaux de KLS3.
        </p>
      </div>

      <PlanningClient items={items} />
    </div>
  )
}
