// Button component following KLS3 Design System (CLAUDE.md Section 39)

import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'nav'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles (pill shape, transitions)
          'inline-flex items-center justify-center',
          'rounded-full transition-all duration-200',
          'font-medium disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',

          // Size variants
          size === 'sm' && 'px-4 py-2 text-sm',
          size === 'md' && 'px-6 py-2.5 text-base',
          size === 'lg' && 'px-8 py-3 text-lg',

          // Style variants
          variant === 'primary' &&
            'bg-accent text-white hover:bg-accent/90 active:bg-accent/80',

          variant === 'ghost' &&
            'bg-transparent border border-white/15 text-text-primary hover:bg-white/5',

          variant === 'nav' &&
            'bg-transparent border border-text-primary/35 text-text-primary hover:bg-accent hover:border-accent',

          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button }
