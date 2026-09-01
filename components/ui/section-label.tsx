// Section Label / Eyebrow component (CLAUDE.md Section 42)

import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

export interface SectionLabelProps extends HTMLAttributes<HTMLDivElement> {
  children: string
}

export function SectionLabel({ className, children, ...props }: SectionLabelProps) {
  return (
    <div className={cn('flex items-center gap-3 mb-6', className)} {...props}>
      <div className="w-7 h-px bg-accent" />
      <span className="text-[11px] uppercase tracking-[0.22em] font-semibold text-accent">
        {children}
      </span>
    </div>
  )
}
