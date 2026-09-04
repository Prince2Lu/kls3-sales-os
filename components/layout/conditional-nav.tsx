// Conditional Nav wrapper - hides Nav on /login page
'use client'

import { usePathname } from 'next/navigation'
import { Nav } from './nav'

interface ConditionalNavProps {
  userEmail?: string | null
}

export function ConditionalNav({ userEmail }: ConditionalNavProps) {
  const pathname = usePathname()

  // Hide Nav on login page
  if (pathname === '/login') {
    return null
  }

  // Show Nav on all other pages
  return <Nav userEmail={userEmail} />
}
