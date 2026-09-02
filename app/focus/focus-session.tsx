'use client'

// Focus Session client component (Phase 5 + Phase 6C-B)
// Manages the Focus workflow state and UI

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { BusinessLineCode } from '@/lib/utils/business-line-filter'
import type { FocusQueueItem } from './queue-builder'
import { FocusProspectView } from './focus-prospect-view'
import { SessionComplete } from './session-complete'

interface FocusSessionProps {
  initialQueue: FocusQueueItem[]
  businessLineCode?: BusinessLineCode | null
}

export type SessionStats = {
  actionsProcessed: number
  conversations: number
  meetingsBooked: number
  noAnswers: number
  startTime: Date
}

export function FocusSession({ initialQueue, businessLineCode }: FocusSessionProps) {
  const router = useRouter()
  const [queue, setQueue] = useState<FocusQueueItem[]>(initialQueue)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [skippedIndices, setSkippedIndices] = useState<Set<number>>(new Set())
  const [stats, setStats] = useState<SessionStats>({
    actionsProcessed: 0,
    conversations: 0,
    meetingsBooked: 0,
    noAnswers: 0,
    startTime: new Date(),
  })

  // Get current item
  const currentItem = queue[currentIndex]

  // Check if session is complete
  const isSessionComplete = currentIndex >= queue.length

  // Handle task completion - advance to next
  const handleTaskComplete = (result: {
    hadConversation?: boolean
    bookedMeeting?: boolean
    noAnswer?: boolean
  }) => {
    // Update stats
    setStats((prev) => ({
      ...prev,
      actionsProcessed: prev.actionsProcessed + 1,
      conversations: prev.conversations + (result.hadConversation ? 1 : 0),
      meetingsBooked: prev.meetingsBooked + (result.bookedMeeting ? 1 : 0),
      noAnswers: prev.noAnswers + (result.noAnswer ? 1 : 0),
    }))

    // Advance to next task
    advanceToNext()
  }

  // Handle skip
  const handleSkip = () => {
    // Mark current index as skipped
    setSkippedIndices((prev) => new Set([...prev, currentIndex]))

    // Advance to next non-skipped task
    advanceToNext()
  }

  // Find next non-skipped index
  const advanceToNext = () => {
    let nextIndex = currentIndex + 1

    // Skip over any already-skipped indices (avoid infinite loop)
    while (nextIndex < queue.length && skippedIndices.has(nextIndex)) {
      nextIndex++
    }

    setCurrentIndex(nextIndex)

    // If we've gone through all tasks, check if we should loop back to skipped ones
    // For V1, we just end the session - no looping back
  }

  // Get Business Line context for display
  const businessLineName = businessLineCode
    ? currentItem?.businessLine?.name || businessLineCode
    : 'Toutes les Business Lines'

  // If session complete, show completion screen
  if (isSessionComplete) {
    return <SessionComplete stats={stats} businessLineCode={businessLineCode || null} />
  }

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-syne">FOCUS</h1>
          <span className="text-text-muted">·</span>
          <span className="text-text-muted text-sm">{businessLineName}</span>
          <span className="text-text-muted">·</span>
          <span className="text-text-muted text-sm">
            Action {currentIndex + 1} sur {queue.length}
          </span>
        </div>
      </div>

      {/* Current prospect view */}
      <FocusProspectView
        item={currentItem}
        onComplete={handleTaskComplete}
        onSkip={handleSkip}
      />
    </div>
  )
}
