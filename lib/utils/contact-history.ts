import type { Activity, ColdCallTarget, Opportunity, Task } from '@/types/domain'

/** Include indirect history only when it is not explicitly assigned to another person. */
export function getContactHistory<T extends Activity | Task>(
  items: T[], contactId: string, targets: ColdCallTarget[], opportunities: Opportunity[]
): T[] {
  const targetIds = new Set(targets.filter(t => t.contactId === contactId).map(t => t.id))
  const opportunityIds = new Set(opportunities.filter(o => o.primaryContactId === contactId).map(o => o.id))
  return items.filter(item => item.contactId === contactId || (!item.contactId && (
    (item.coldCallTargetId && targetIds.has(item.coldCallTargetId)) ||
    (item.opportunityId && opportunityIds.has(item.opportunityId))
  )))
}

export function getParisFormDateTime(value: string | Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const part = (name: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === name)!.value
  return { date: `${part('year')}-${part('month')}-${part('day')}`, time: `${part('hour')}:${part('minute')}` }
}
