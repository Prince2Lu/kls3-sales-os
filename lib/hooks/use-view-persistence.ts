'use client'

// View persistence hook
// Stores and retrieves view preference from localStorage

import { useState, useEffect } from 'react'
import type { ViewMode } from '@/components/ui/search-view-toolbar'

export function useViewPersistence(storageKey: string, defaultView: ViewMode = 'grid') {
  const [view, setView] = useState<ViewMode>(defaultView)
  const [isClient, setIsClient] = useState(false)

  // Hydration-safe initialization
  useEffect(() => {
    setIsClient(true)
    const stored = localStorage.getItem(storageKey)
    if (stored === 'grid' || stored === 'list') {
      setView(stored)
    }
  }, [storageKey])

  const updateView = (newView: ViewMode) => {
    setView(newView)
    if (isClient) {
      localStorage.setItem(storageKey, newView)
    }
  }

  return [view, updateView, isClient] as const
}
