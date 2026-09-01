// Badge component following KLS3 Design System

import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'accent' | 'muted'
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5',
        'text-xs font-medium transition-colors',
        variant === 'default' &&
          'bg-white/10 text-text-primary border border-border',
        variant === 'accent' && 'bg-accent/20 text-accent border border-accent/30',
        variant === 'muted' && 'bg-white/5 text-text-muted border border-white/5',
        className
      )}
      {...props}
    />
  )
}
