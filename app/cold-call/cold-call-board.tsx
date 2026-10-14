'use client'

// Prospecting Kanban Board with drag-and-drop
// Multi-channel: cold call, email, LinkedIn, referrals, etc.

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type {
  ColdCallTarget,
  BusinessLine,
  Company,
  Contact,
  Opportunity,
  CallStatus,
  Activity,
  Task,
} from '@/types/domain'
import { updateColdCallStatus, updateColdCallOpportunityStage } from './actions'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ColdCallColumn } from './cold-call-column'
import { CallbackModal } from './callback-modal'
import { Search, X, Phone, CalendarDays, MessageCircle, CalendarCheck } from 'lucide-react'
import { normalizeSearchValue, combineSearchValues, normalizePhoneForSearch } from '@/lib/utils/search'

interface ColdCallBoardProps {
  targets: ColdCallTarget[]
  businessLines: BusinessLine[]
  companies: Company[]
  contacts: Contact[]
  opportunities: Opportunity[]
  activities: Activity[]
  tasks: Task[]
  currentOwner: 'Eric' | 'Lilian'
}

// Active prospecting status columns (Lilian's familiar labels)
// Multi-channel: cold call, email, LinkedIn, referrals, etc.
// Includes 'Converti' - visible trace of converted prospects (EMAIL_REPLY, CONVERSATION, CALLBACK)
// Includes 'RDV booké' - visible trace of confirmed meetings (MEETING_BOOKED)
const CALL_STATUSES: CallStatus[] = [
  'À appeler',
  'À rappeler',
  'Email Flow',
  'Mauvais numéro',
  'Pas intéressé',
  'Converti',
  'RDV booké',
]

// Opportunity stages for post-RDV (displayed in cold call view)
const POST_RDV_STAGES = ['Gagné', 'Perdu'] as const

export function ColdCallBoard({
  targets,
  businessLines,
  companies,
  contacts,
  opportunities,
  activities,
  tasks,
  currentOwner,
}: ColdCallBoardProps) {
  const router = useRouter()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedBusinessLineId, setSelectedBusinessLineId] = useState<
    string | null
  >(null)
  const [search, setSearch] = useState('')

  // Callback modal state
  const [showCallbackModal, setShowCallbackModal] = useState(false)
  const [pendingCallbackTargetId, setPendingCallbackTargetId] = useState<
    string | null
  >(null)

  // Create lookup maps
  const blMap = useMemo(
    () => Object.fromEntries(businessLines.map((bl) => [bl.id, bl])),
    [businessLines]
  )

  // Filter Business Lines for dropdown: only BLs present in active targets
  // (All BLs needed for badge display, but only active BLs for filtering)
  const targetBusinessLineIds = useMemo(
    () => new Set(targets.map((t) => t.businessLineId)),
    [targets]
  )

  const activeBusinessLines = useMemo(
    () => businessLines.filter((bl) => targetBusinessLineIds.has(bl.id)),
    [businessLines, targetBusinessLineIds]
  )

  const companiesMap = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies]
  )

  const contactsMap = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.id, c])),
    [contacts]
  )

  const opportunitiesMap = useMemo(
    () => Object.fromEntries(opportunities.map((o) => [o.id, o])),
    [opportunities]
  )

  // Group activities by coldCallTargetId for efficient access
  const activitiesByTargetId = useMemo(() => {
    const grouped: Record<string, typeof activities> = {}
    activities.forEach((activity) => {
      if (activity.coldCallTargetId) {
        if (!grouped[activity.coldCallTargetId]) {
          grouped[activity.coldCallTargetId] = []
        }
        grouped[activity.coldCallTargetId].push(activity)
      }
    })
    return grouped
  }, [activities])

  // Group tasks by coldCallTargetId for efficient access
  const tasksByTargetId = useMemo(() => {
    const grouped: Record<string, typeof tasks> = {}
    tasks.forEach((task) => {
      if (task.coldCallTargetId) {
        if (!grouped[task.coldCallTargetId]) {
          grouped[task.coldCallTargetId] = []
        }
        grouped[task.coldCallTargetId].push(task)
      }
    })
    return grouped
  }, [tasks])

  // Filter targets by Business Line and Search
  const filteredTargets = useMemo(() => {
    let result = [...targets]

    // 1. Filter by Business Line
    if (selectedBusinessLineId) {
      result = result.filter((t) => t.businessLineId === selectedBusinessLineId)
    }

    // 2. Filter by Search
    if (search.trim()) {
      const searchNormalized = normalizeSearchValue(search)
      const searchPhone = normalizePhoneForSearch(search)

      result = result.filter((target) => {
        const company = companiesMap[target.companyId]
        const contact = target.contactId ? contactsMap[target.contactId] : null

        // Search company name
        if (normalizeSearchValue(company?.name).includes(searchNormalized)) {
          return true
        }

        // Search contact if exists
        if (contact) {
          // Search firstName
          if (normalizeSearchValue(contact.firstName).includes(searchNormalized)) {
            return true
          }

          // Search lastName
          if (normalizeSearchValue(contact.lastName).includes(searchNormalized)) {
            return true
          }

          // Search fullName (firstName lastName)
          const fullName = combineSearchValues([contact.firstName, contact.lastName])
          if (fullName.includes(searchNormalized)) {
            return true
          }

          // Search reversed fullName (lastName firstName)
          const reversedFullName = combineSearchValues([contact.lastName, contact.firstName])
          if (reversedFullName.includes(searchNormalized)) {
            return true
          }

          // Search email
          if (normalizeSearchValue(contact.email).includes(searchNormalized)) {
            return true
          }

          // Search contact phone
          if (contact.phone) {
            const phoneNormalized = normalizePhoneForSearch(contact.phone)
            if (phoneNormalized.includes(searchPhone)) {
              return true
            }
          }
        }

        // Search company phone (fallback or primary)
        if (company?.phone) {
          const phoneNormalized = normalizePhoneForSearch(company.phone)
          if (phoneNormalized.includes(searchPhone)) {
            return true
          }
        }

        return false
      })
    }

    return result
  }, [targets, selectedBusinessLineId, search, companiesMap, contactsMap])

  // Group targets by call status (pre-opportunity)
  const targetsByStatus = useMemo(() => {
    const grouped: Record<string, ColdCallTarget[]> = {}
    CALL_STATUSES.forEach((status) => {
      grouped[status] = []
    })

    filteredTargets.forEach((target) => {
      if (grouped[target.callStatus]) {
        grouped[target.callStatus].push(target)
      }
    })

    return grouped
  }, [filteredTargets])

  // Group targets with opportunities by stage (post-RDV: Gagné, Perdu)
  const targetsByStage = useMemo(() => {
    const grouped: Record<string, ColdCallTarget[]> = {
      Gagné: [],
      Perdu: [],
    }

    filteredTargets.forEach((target) => {
      if (target.opportunityId) {
        const opp = opportunitiesMap[target.opportunityId]
        if (opp && (opp.stage === 'Gagné' || opp.stage === 'Perdu')) {
          grouped[opp.stage].push(target)
        }
      }
    })

    return grouped
  }, [filteredTargets, opportunitiesMap])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const targetId = active.id as string
    const overId = String(over.id)

    // Find the dragged target
    const target = targets.find((t) => t.id === targetId)
    if (!target) return

    // Resolve destination from either the column itself OR a card inside it.
    // dnd-kit returns the hovered card id when dropping between cards, so only
    // checking column ids makes drops work mainly on empty/top areas.
    const overTarget = targets.find((t) => t.id === overId)
    const overOpportunity = overTarget?.opportunityId
      ? opportunitiesMap[overTarget.opportunityId]
      : null

    const resolvedCallStatus = CALL_STATUSES.includes(overId as CallStatus)
      ? (overId as CallStatus)
      : overTarget && CALL_STATUSES.includes(overTarget.callStatus)
        ? overTarget.callStatus
        : null

    const resolvedStage = POST_RDV_STAGES.includes(
      overId as (typeof POST_RDV_STAGES)[number]
    )
      ? (overId as (typeof POST_RDV_STAGES)[number])
      : overOpportunity &&
          POST_RDV_STAGES.includes(
            overOpportunity.stage as (typeof POST_RDV_STAGES)[number]
          )
        ? (overOpportunity.stage as (typeof POST_RDV_STAGES)[number])
        : null

    if (resolvedCallStatus) {
      const newStatus = resolvedCallStatus

      // If already in this status, do nothing
      if (target.callStatus === newStatus) return

      // Special handling for "À rappeler" - show modal for callback date
      if (newStatus === 'À rappeler') {
        setPendingCallbackTargetId(targetId)
        setShowCallbackModal(true)
        return
      }

      // Update status directly
      // changedBy is determined server-side from session
      setIsUpdating(true)
      const result = await updateColdCallStatus(targetId, newStatus)
      setIsUpdating(false)

      if (result.success) {
        router.refresh()
      } else {
        alert('Erreur lors de la mise à jour')
      }
    } else if (resolvedStage) {
      const newStage = resolvedStage as 'Gagné' | 'Perdu'

      // Must have an opportunity to move to Gagné/Perdu
      if (!target.opportunityId) {
        alert('Impossible de passer à Gagné/Perdu sans conversion en opportunité')
        return
      }

      const opp = opportunitiesMap[target.opportunityId]
      if (!opp) return

      // If already in this stage, do nothing
      if (opp.stage === newStage) return

      // changedBy is determined server-side from session
      setIsUpdating(true)
      const result = await updateColdCallOpportunityStage(
        targetId,
        newStage
      )
      setIsUpdating(false)

      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || 'Erreur lors de la mise à jour')
      }
    }
  }

  async function handleCallbackConfirm(targetId: string, callbackDate: string) {
    setShowCallbackModal(false)
    setPendingCallbackTargetId(null)

    // changedBy is determined server-side from session
    setIsUpdating(true)
    const result = await updateColdCallStatus(targetId, 'À rappeler', {
      callbackDate,
    })
    setIsUpdating(false)

    if (result.success) {
      router.refresh()
    } else {
      alert('Erreur lors de la création du rappel')
    }
  }

  const activeTarget = activeId ? targets.find((t) => t.id === activeId) : null

  const callKpis = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    const day = weekStart.getDay()
    weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1))

    const scopedActivities = activities.filter((activity) => {
      if (!activity.coldCallTargetId) return false
      const target = targets.find((item) => item.id === activity.coldCallTargetId)
      if (!target) return false
      return !selectedBusinessLineId || target.businessLineId === selectedBusinessLineId
    })

    const isToday = (date: string) => new Date(date) >= todayStart
    const isThisWeek = (date: string) => new Date(date) >= weekStart
    const callsToday = scopedActivities.filter((activity) => activity.type === 'CALL' && isToday(activity.date))
    const callsWeek = scopedActivities.filter((activity) => activity.type === 'CALL' && isThisWeek(activity.date))

    return {
      callsToday: callsToday.length,
      callsWeek: callsWeek.length,
      conversationsToday: scopedActivities.filter((activity) => activity.result === 'CONVERSATION' && isToday(activity.date)).length,
      meetingsToday: scopedActivities.filter((activity) => activity.result === 'MEETING_BOOKED' && isToday(activity.date)).length,
      ericToday: callsToday.filter((activity) => activity.owner === 'Eric').length,
      lilianToday: callsToday.filter((activity) => activity.owner === 'Lilian').length,
    }
  }, [activities, targets, selectedBusinessLineId])

  const callKpiCards = [
    { label: "Appels aujourd'hui", value: callKpis.callsToday, icon: Phone, detail: `Eric ${callKpis.ericToday} · Lilian ${callKpis.lilianToday}` },
    { label: 'Appels cette semaine', value: callKpis.callsWeek, icon: CalendarDays },
    { label: "Conversations aujourd'hui", value: callKpis.conversationsToday, icon: MessageCircle },
    { label: "RDV obtenus aujourd'hui", value: callKpis.meetingsToday, icon: CalendarCheck },
  ]

  return (
    <div className="relative space-y-4">
      {/* Daily call KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {callKpiCards.map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.label} className="bg-card-bg border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-wide text-text-muted">{metric.label}</div>
                <Icon className="w-4 h-4 text-accent" />
              </div>
              <div className="mt-2 text-3xl font-semibold font-syne">{metric.value}</div>
              {metric.detail && <div className="mt-1 text-xs text-text-muted">{metric.detail}</div>}
            </div>
          )
        })}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Rechercher un contact, une entreprise, un email ou un téléphone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-card-bg border border-border rounded-full pl-10 pr-10 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Effacer la recherche"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters and Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Business Line Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-muted">Business Line:</label>
          <select
            value={selectedBusinessLineId || ''}
            onChange={(e) => setSelectedBusinessLineId(e.target.value || null)}
            className="px-3 py-1 bg-card-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Toutes</option>
            {activeBusinessLines.map((bl) => (
              <option key={bl.id} value={bl.id}>
                {bl.code === 'SACHA' ? 'Leverio' : bl.name}
              </option>
            ))}
          </select>
        </div>

        {/* Result count when search active */}
        {search && (
          <div className="text-sm text-text-muted">
            {filteredTargets.length} résultat{filteredTargets.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {isUpdating && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center">
          <div className="text-text-primary">Mise à jour...</div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {/* Call Status Columns */}
          {CALL_STATUSES.map((status) => (
            <ColdCallColumn
              key={status}
              id={status}
              title={status}
              targets={targetsByStatus[status] || []}
              companiesMap={companiesMap}
              contactsMap={contactsMap}
              blMap={blMap}
              activitiesByTargetId={activitiesByTargetId}
              tasksByTargetId={tasksByTargetId}
              currentOwner={currentOwner}
            />
          ))}

          {/* Gagné / Perdu Columns */}
          {POST_RDV_STAGES.map((stage) => (
            <ColdCallColumn
              key={stage}
              id={stage}
              title={stage}
              targets={targetsByStage[stage] || []}
              companiesMap={companiesMap}
              contactsMap={contactsMap}
              blMap={blMap}
              activitiesByTargetId={activitiesByTargetId}
              tasksByTargetId={tasksByTargetId}
              currentOwner={currentOwner}
              isStageColumn
            />
          ))}
        </div>

        <DragOverlay>{activeTarget && <div>Déplacement...</div>}</DragOverlay>
      </DndContext>

      {/* Callback Modal */}
      {showCallbackModal && pendingCallbackTargetId && (
        <CallbackModal
          onConfirm={(date) => handleCallbackConfirm(pendingCallbackTargetId, date)}
          onCancel={() => {
            setShowCallbackModal(false)
            setPendingCallbackTargetId(null)
          }}
        />
      )}
    </div>
  )
}
