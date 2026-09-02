// French label utilities for consistent UI display
// No raw CALL, FOLLOW_UP, TODO, HIGH, etc.

import type { Stage, Priority, ActivityType, ActivityResult, TaskType, TaskStatus } from '@/types/domain'

/**
 * Get French label for stage
 */
export function getStageLabel(stage: Stage): string {
  // Stages are already in French in the domain model
  return stage
}

/**
 * Get French label for priority
 */
export function getPriorityLabel(priority: Priority): string {
  switch (priority) {
    case 'URGENT':
      return 'Urgent'
    case 'HIGH':
      return 'Élevée'
    case 'MEDIUM':
      return 'Moyenne'
    case 'LOW':
      return 'Faible'
    default:
      return priority
  }
}

/**
 * Get French label for activity type
 */
export function getActivityTypeLabel(type: ActivityType): string {
  switch (type) {
    case 'CALL':
      return 'Appel'
    case 'EMAIL':
      return 'Email'
    case 'LINKEDIN':
      return 'LinkedIn'
    case 'MEETING':
      return 'Rendez-vous'
    case 'DEMO':
      return 'Démo'
    case 'PROPOSAL':
      return 'Proposition'
    case 'NOTE':
      return 'Note'
    case 'OTHER':
      return 'Autre'
    default:
      return type
  }
}

/**
 * Get French label for activity result
 */
export function getActivityResultLabel(result: ActivityResult): string {
  switch (result) {
    case 'NO_ANSWER':
      return 'Pas de réponse'
    case 'CONVERSATION':
      return 'Conversation'
    case 'MEETING_BOOKED':
      return 'RDV pris'
    case 'NOT_INTERESTED':
      return 'Pas intéressé'
    case 'CALLBACK':
      return 'À rappeler'
    default:
      return result
  }
}

/**
 * Get French label for task type
 */
export function getTaskTypeLabel(type: TaskType): string {
  switch (type) {
    case 'CALL':
      return 'Appel'
    case 'EMAIL':
      return 'Email'
    case 'LINKEDIN':
      return 'LinkedIn'
    case 'MEETING':
      return 'Rendez-vous'
    case 'DEMO':
      return 'Démo'
    case 'FOLLOW_UP':
      return 'Relance'
    case 'OTHER':
      return 'Autre'
    default:
      return type
  }
}

/**
 * Get French label for task status
 */
export function getTaskStatusLabel(status: TaskStatus): string {
  switch (status) {
    case 'TODO':
      return 'À faire'
    case 'DONE':
      return 'Terminée'
    case 'CANCELLED':
      return 'Annulée'
    default:
      return status
  }
}
