// Main navigation component (CLAUDE.md Section 46)

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/today', label: 'Ma journée' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/prospects', label: 'Prospects' },
  { href: '/companies', label: 'Entreprises' },
  { href: '/contacts', label: 'Contacts' },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
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
          </div>
        </div>

        <div>
          <Link href="/prospects/new">
            <Button size="sm">+ Prospect</Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
