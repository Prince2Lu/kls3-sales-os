// Main navigation component V2 - Responsive design for 13" screens
// Clean, professional, compact header with dropdown menus

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { UserMenuV2 } from '@/components/layout/user-menu-v2'
import { CreateMenu } from '@/components/layout/create-menu'
import {
  DropdownMenu,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// Opportunités submenu items
const opportunitiesItems = [
  { href: '/pipeline', label: 'Vue Kanban' },
  { href: '/prospects', label: 'Vue Liste' },
]

// Primary navigation items - always visible on desktop
const primaryNavItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/today', label: 'Aujourd\'hui' },
  { href: '/cold-call', label: 'Cold Call' },
]

// Secondary navigation items - in "Plus" dropdown on medium screens
const secondaryNavItems = [
  { href: '/analytics', label: 'Analytics' },
  { href: '/companies', label: 'Entreprises' },
  { href: '/contacts', label: 'Contacts' },
  { href: '/relationships', label: 'Relations' },
]

// Compact navigation for medium screens (tablet/small laptop)
// Shows only essential items, rest in "Plus"
const compactNavItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/cold-call', label: 'Cold Call' },
]

const compactSecondaryItems = [
  { href: '/today', label: 'Aujourd\'hui' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/companies', label: 'Entreprises' },
  { href: '/contacts', label: 'Contacts' },
  { href: '/relationships', label: 'Relations' },
]

interface NavV2Props {
  userEmail?: string | null
  userName?: string | null
}

export function NavV2({ userEmail, userName }: NavV2Props = {}) {
  const pathname = usePathname()

  // Check if current path is within Opportunités section
  const isOpportunitiesActive = pathname === '/pipeline' || pathname === '/prospects'

  const NavItem = ({ href, label }: { href: string; label: string }) => {
    const isActive = pathname === href || pathname?.startsWith(`${href}/`)

    return (
      <Link href={href}>
        <Button
          variant={isActive ? 'primary' : 'nav'}
          size="sm"
          className={cn(
            'transition-all whitespace-nowrap',
            isActive && 'ring-2 ring-accent/20'
          )}
        >
          {label}
        </Button>
      </Link>
    )
  }

  const OpportunitesMenu = () => {
    const trigger = (
      <Button
        variant={isOpportunitiesActive ? 'primary' : 'nav'}
        size="sm"
        className={cn(
          'transition-all whitespace-nowrap',
          isOpportunitiesActive && 'ring-2 ring-accent/20'
        )}
      >
        Opportunités
      </Button>
    )

    return (
      <DropdownMenu trigger={trigger} hoverEnabled={true}>
        {opportunitiesItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <DropdownMenuItem
              className={cn(
                'cursor-pointer',
                pathname === item.href && 'bg-accent/10 text-accent font-medium'
              )}
            >
              {item.label}
            </DropdownMenuItem>
          </Link>
        ))}
      </DropdownMenu>
    )
  }

  const MoreMenu = ({ items }: { items: typeof secondaryNavItems }) => {
    const hasActiveItem = items.some(
      (item) => pathname === item.href || pathname?.startsWith(`${item.href}/`)
    )

    const trigger = (
      <Button
        variant={hasActiveItem ? 'primary' : 'nav'}
        size="sm"
        className={cn(
          'gap-1 whitespace-nowrap',
          hasActiveItem && 'ring-2 ring-accent/20'
        )}
      >
        <span>Plus</span>
        <MoreHorizontal className="w-4 h-4" />
      </Button>
    )

    return (
      <DropdownMenu trigger={trigger}>
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`)

          return (
            <Link key={item.href} href={item.href}>
              <DropdownMenuItem
                className={cn(
                  'cursor-pointer',
                  isActive && 'bg-accent/10 text-accent font-medium'
                )}
              >
                {item.label}
              </DropdownMenuItem>
            </Link>
          )
        })}
      </DropdownMenu>
    )
  }

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <Logo size="md" />
        </Link>

        {/* Center: Navigation */}
        <div className="flex items-center gap-1.5 mx-4 lg:mx-8">
          {/* Compact nav - visible on medium screens (768-1023px) */}
          <div className="hidden md:flex lg:hidden items-center gap-1.5">
            {compactNavItems.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
            <OpportunitesMenu />
            <MoreMenu items={compactSecondaryItems} />
          </div>

          {/* Primary nav + "Plus" - visible on large screens (1024-1535px) */}
          <div className="hidden lg:flex 2xl:hidden items-center gap-1.5">
            {primaryNavItems.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
            <OpportunitesMenu />
            <MoreMenu items={secondaryNavItems} />
          </div>

          {/* All nav items - visible on very large screens (1536px+) */}
          <div className="hidden 2xl:flex items-center gap-1.5">
            {primaryNavItems.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
            <OpportunitesMenu />
            {secondaryNavItems.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>

          {/* Mobile: All items in dropdown */}
          <div className="md:hidden">
            <OpportunitesMenu />
            <MoreMenu items={[...primaryNavItems, ...secondaryNavItems]} />
          </div>
        </div>

        {/* Right: CTA + User menu */}
        <div className="flex items-center gap-3 shrink-0">
          <CreateMenu />
          <UserMenuV2 userEmail={userEmail} userName={userName} />
        </div>
      </div>
    </nav>
  )
}
