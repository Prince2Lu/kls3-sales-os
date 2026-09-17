// Main navigation component (CLAUDE.md Section 46)

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/layout/user-menu'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/today', label: "Aujourd'hui" },
  { href: '/cold-call', label: 'Prospection' },
  { href: '/focus', label: 'Focus' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/companies', label: 'Entreprises' },
  { href: '/contacts', label: 'Contacts' },
  { href: '/relationships', label: 'Relations' },
]

// Opportunités submenu items
const opportunitiesItems = [
  { href: '/pipeline', label: 'Vue Kanban' },
  { href: '/prospects', label: 'Vue Liste' },
]

interface NavProps {
  userEmail?: string | null
}

export function Nav({ userEmail }: NavProps = {}) {
  const pathname = usePathname()

  // Check if current path is within Opportunités section
  const isOpportunitiesActive = pathname === '/pipeline' || pathname === '/prospects'

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <Logo size="md" />
          </Link>

          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={pathname === item.href ? 'primary' : 'nav'}
                  size="sm"
                  className={cn(
                    'transition-all',
                    pathname === item.href && 'ring-2 ring-accent/20'
                  )}
                >
                  {item.label}
                </Button>
              </Link>
            ))}

            {/* Opportunités dropdown menu - hover enabled on desktop */}
            <DropdownMenu
              hoverEnabled={true}
              trigger={
                <Button
                  variant={isOpportunitiesActive ? 'primary' : 'nav'}
                  size="sm"
                  className={cn(
                    'transition-all',
                    isOpportunitiesActive && 'ring-2 ring-accent/20'
                  )}
                >
                  Opportunités
                </Button>
              }
            >
              {opportunitiesItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <DropdownMenuItem>
                    {item.label}
                  </DropdownMenuItem>
                </Link>
              ))}
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/prospects/new">
            <Button size="sm">+ Opportunité</Button>
          </Link>
          <UserMenu userEmail={userEmail} />
        </div>
      </div>
    </nav>
  )
}
