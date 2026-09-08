'use client'

// Sheet component for drawer/sidebar overlays
// KLS3 Sales OS Design System

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  side?: 'left' | 'right'
}

export function Sheet({ open, onClose, children, side = 'right' }: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const content = (
    <>
      {/* Sheet - No visual backdrop, Pipeline remains visible */}
      <div
        ref={sheetRef}
        className={`fixed top-0 bottom-0 w-full max-w-md bg-card border-border shadow-xl overflow-y-auto z-50 ${
          side === 'right'
            ? 'right-0 border-l animate-slide-in-right'
            : 'left-0 border-r animate-slide-in-left'
        }`}
      >
        {children}
      </div>
    </>
  )

  return createPortal(content, document.body)
}

interface SheetHeaderProps {
  children: React.ReactNode
}

export function SheetHeader({ children }: SheetHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4">
      {children}
    </div>
  )
}

interface SheetTitleProps {
  children: React.ReactNode
}

export function SheetTitle({ children }: SheetTitleProps) {
  return (
    <h2 className="text-xl font-semibold text-text-primary font-syne">
      {children}
    </h2>
  )
}

interface SheetContentProps {
  children: React.ReactNode
}

export function SheetContent({ children }: SheetContentProps) {
  return <div className="px-6 py-6 space-y-6">{children}</div>
}
