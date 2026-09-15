// Conditional Nav wrapper - hides Nav on /login page
'use client'

import { usePathname } from 'next/navigation'
import { NavV2 } from './nav-v2'

interface ConditionalNavProps {
  userEmail?: string | null
  userName?: string | null
}

export function ConditionalNav({ userEmail, userName }: ConditionalNavProps) {
  const pathname = usePathname()

  // Hide Nav on login page
  if (pathname === '/login') {
    return null
  }

  // Show NavV2 (responsive, professional design) on all other pages
  return <NavV2 userEmail={userEmail} userName={userName} />
}
