'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Owner, Priority, TaskType } from '@/types/domain'
import { getFrenchTaskType } from '@/lib/utils/french-labels'

type ViewMode = 'week' | 'month'
type OwnerFilter = 'ALL' | Owner
type TypeFilter = 'ALL' | 'MEETING' | 'TASK'

interface PlanningItem {
  id: string
  dueAt: string
  type: TaskType
  owner: Owner
  priority: Priority | null
  notes: string | null
  companyId: string | null
  companyName: string | null
  contactId: string | null
  contactName: string | null
  opportunityId: string | null
  opportunityName: string | null
  businessLineId: string | null
  businessLineName: string | null
  href: string
}

interface PlanningClientProps {
  items: PlanningItem[]
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function startOfWeek(date: Date) {
  const result = new Date(date)
  const day = result.getDay() || 7
  result.setDate(result.getDate() - day + 1)
  result.setHours(0, 0, 0, 0)
  return result
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function addMonths(date: Date, months: number) {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatHeader(date: Date, mode: ViewMode) {
  if (mode === 'month') {
    return date.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    })
  }

  const start = startOfWeek(date)
  const end = addDays(start, 6)
  return `${start.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  })} – ${end.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`
}

function itemLabel(item: PlanningItem) {
  if (item.type === 'MEETING') {
    return item.companyName ? `RDV — ${item.companyName}` : 'Rendez-vous'
  }

  const type = getFrenchTaskType(item.type)
  return item.companyName ? `${type} — ${item.companyName}` : type
}

function ItemCard({ item, compact = false }: { item: PlanningItem; compact?: boolean }) {
  return (
    <Link
      href={item.href}
      className="block rounded-lg border border-border bg-card p-2 hover:border-accent/50 transition-colors"
      title={item.notes || itemLabel(item)}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[11px] font-medium shrink-0">{formatTime(item.dueAt)}</span>
        <span className="text-xs font-medium truncate">{itemLabel(item)}</span>
      </div>

      {!compact && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant={item.type === 'MEETING' ? 'accent' : 'muted'}>
            {item.type === 'MEETING' ? 'RDV' : 'Tâche'}
          </Badge>
          <span className="text-[11px] text-text-muted">{item.owner}</span>
          {item.contactName && (
            <span className="text-[11px] text-text-muted">· {item.contactName}</span>
          )}
          {item.businessLineName && (
            <span className="text-[11px] text-text-muted">· {item.businessLineName}</span>
          )}
        </div>
      )}
    </Link>
  )
}

export function PlanningClient({ items }: PlanningClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [cursor, setCursor] = useState(() => new Date())
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('ALL')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (ownerFilter !== 'ALL' && item.owner !== ownerFilter) return false
        if (typeFilter === 'MEETING' && item.type !== 'MEETING') return false
        if (typeFilter === 'TASK' && item.type === 'MEETING') return false
        return true
      }),
    [items, ownerFilter, typeFilter]
  )

  const itemsByDay = useMemo(() => {
    const map = new Map<string, PlanningItem[]>()
    for (const item of filteredItems) {
      const key = dateKey(new Date(item.dueAt))
      const existing = map.get(key) || []
      existing.push(item)
      existing.sort(
        (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      )
      map.set(key, existing)
    }
    return map
  }, [filteredItems])

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor)
    return Array.from({ length: 7 }, (_, index) => addDays(start, index))
  }, [cursor])

  const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const gridStart = startOfWeek(first)
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
  }, [cursor])

  const goPrevious = () =>
    setCursor((current) =>
      viewMode === 'week' ? addDays(current, -7) : addMonths(current, -1)
    )

  const goNext = () =>
    setCursor((current) =>
      viewMode === 'week' ? addDays(current, 7) : addMonths(current, 1)
    )

  const today = new Date()

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goPrevious} title="Précédent">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            Aujourd’hui
          </Button>
          <Button variant="ghost" size="sm" onClick={goNext} title="Suivant">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="ml-1 text-lg font-semibold capitalize">
            {formatHeader(cursor, viewMode)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={ownerFilter}
            onChange={(event) => setOwnerFilter(event.target.value as OwnerFilter)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm"
          >
            <option value="ALL">Eric + Lilian</option>
            <option value="Eric">Eric</option>
            <option value="Lilian">Lilian</option>
          </select>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm"
          >
            <option value="ALL">RDV + tâches</option>
            <option value="MEETING">RDV uniquement</option>
            <option value="TASK">Tâches uniquement</option>
          </select>

          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={
                'px-3 py-2 text-sm ' +
                (viewMode === 'week'
                  ? 'bg-accent text-white'
                  : 'bg-card text-text-primary')
              }
            >
              Semaine
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={
                'px-3 py-2 text-sm ' +
                (viewMode === 'month'
                  ? 'bg-accent text-white'
                  : 'bg-card text-text-primary')
              }
            >
              Mois
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {viewMode === 'week' ? (
          <div className="grid grid-cols-1 md:grid-cols-7">
            {weekDays.map((day) => {
              const dayItems = itemsByDay.get(dateKey(day)) || []
              const isToday = sameDay(day, today)

              return (
                <div
                  key={day.toISOString()}
                  className="min-h-48 border-b border-border md:border-b-0 md:border-r last:border-r-0 p-3"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-text-muted">
                        {WEEKDAYS[(day.getDay() + 6) % 7]}
                      </div>
                      <div
                        className={
                          'text-lg font-semibold ' +
                          (isToday ? 'text-accent' : '')
                        }
                      >
                        {day.getDate()}
                      </div>
                    </div>
                    {dayItems.length > 0 && (
                      <Badge variant="muted">{dayItems.length}</Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    {dayItems.length === 0 ? (
                      <div className="text-xs text-text-muted">—</div>
                    ) : (
                      dayItems.map((item) => <ItemCard key={item.id} item={item} />)
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((label) => (
              <div
                key={label}
                className="px-2 py-2 text-center text-xs font-medium text-text-muted border-b border-border"
              >
                {label}
              </div>
            ))}

            {monthDays.map((day) => {
              const dayItems = itemsByDay.get(dateKey(day)) || []
              const inCurrentMonth = day.getMonth() === cursor.getMonth()
              const isToday = sameDay(day, today)

              return (
                <div
                  key={day.toISOString()}
                  className={
                    'min-h-28 border-b border-r border-border p-1.5 sm:p-2 ' +
                    (!inCurrentMonth ? 'opacity-45' : '')
                  }
                >
                  <div
                    className={
                      'mb-1 text-xs font-medium ' + (isToday ? 'text-accent' : '')
                    }
                  >
                    {day.getDate()}
                  </div>

                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map((item) => (
                      <ItemCard key={item.id} item={item} compact />
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-[11px] text-text-muted px-1">
                        + {dayItems.length - 3} autre(s)
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <CalendarDays className="w-5 h-5 text-accent mt-0.5" />
          <div>
            <div className="text-sm font-medium">Calendrier externe</div>
            <p className="text-xs text-text-muted mt-1">
              Cette première version consolide les tâches et RDV déjà présents dans Sales OS.
              La connexion à votre agenda externe sera ajoutée sur ce même planning après
              identification du fournisseur de calendrier utilisé par KLS3.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
