// KLS3 Logo component (CLAUDE.md Section 38)
// Rule: KLS in #F0EDE8, 3 ALWAYS in #4B7BF5

import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

export interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ size = 'md', className, ...props }: LogoProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  return (
    <div
      className={cn('font-syne font-bold', sizeClasses[size], className)}
      {...props}
    >
      <span className="text-text-primary">KLS</span>
      <span className="text-accent">3</span>
    </div>
  )
}
