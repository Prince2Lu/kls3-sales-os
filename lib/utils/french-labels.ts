// French label presentation helpers (Phase 4 UX polish)

import type { TaskType, Priority, ActivityType } from '@/types/domain'

export function getFrenchTaskType(type: TaskType): string {
  const labels: Record<TaskType, string> = {
    CALL: 'Appel',
    EMAIL: 'Email',
    LINKEDIN: 'LinkedIn',
    MEETING: 'Réunion',
    DEMO: 'Démo',
    FOLLOW_UP: 'Relance',
    OTHER: 'Autre',
  }
  return labels[type] || type
}

export function getFrenchPriority(priority: Priority): string {
  const labels: Record<Priority, string> = {
    LOW: 'Basse',
    MEDIUM: 'Moyenne',
    HIGH: 'Haute',
    URGENT: 'Urgente',
  }
  return labels[priority] || priority
}

export function getFrenchActivityType(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    CALL: 'Appel',
    EMAIL: 'Email',
    LINKEDIN: 'LinkedIn',
    MEETING: 'Réunion',
    DEMO: 'Démo',
    PROPOSAL: 'Proposition',
    NOTE: 'Note',
    OTHER: 'Autre',
  }
  return labels[type] || type
}
