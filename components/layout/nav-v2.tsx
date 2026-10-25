'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { CalendarDays, ChevronDown, CircleDot, Home, Menu, Target, X } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { UserMenuV2 } from '@/components/layout/user-menu-v2'
import { CreateMenu } from '@/components/layout/create-menu'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type NavLink = {
  href: string
  label: string
}

const dailyItems: NavLink[] = [
  { href: '/today', label: "Aujourd'hui" },
  { href: '/planning', label: 'Planning' },
  { href: '/cold-call', label: 'Prospection' },
]

const opportunitiesItems: NavLink[] = [
  { href: '/pipeline', label: 'Vue Kanban' },
  { href: '/prospects', label: 'Vue liste' },
]

const clientsItems: NavLink[] = [
  { href: '/companies', label: 'Entreprises' },
  { href: '/contacts', label: 'Contacts' },
]

const steeringItems: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/analytics', label: 'Analytics' },
]

const toolGroups: Array<{ label: string; items: NavLink[] }> = [
  {
    label: 'Prospection & campagnes',
    items: [
      { href: '/imports', label: 'Ajouter des prospects' },
      { href: '/email-campaigns', label: 'Campagnes email' },
      { href: '/email-campaigns/follow-up', label: 'Appels après campagne' },
      { href: '/email-suppressions', label: 'Exclusions email' },
    ],
  },
  {
    label: 'Cartes & contacts',
    items: [
      { href: '/digital-cards', label: 'Cartes de visite' },
      { href: '/digital-cards/vcards', label: 'vCards' },
      { href: '/digital-cards/stats', label: 'Statistiques cartes' },
    ],
  },
  {
    label: 'Paramètres & conformité',
    items: [
      { href: '/settings/email', label: 'Paramètres messagerie' },
      { href: '/privacy-requests', label: 'Demandes RGPD' },
    ],
  },
]

const toolsItems = toolGroups.flatMap((group) => group.items)

interface NavV2Props {
  userEmail?: string | null
  userName?: string | null
}

function pathMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function NavV2({ userEmail, userName }: NavV2Props = {}) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isOpportunitiesActive = opportunitiesItems.some((item) =>
    pathMatches(pathname, item.href)
  )
  const isClientsActive = clientsItems.some((item) =>
    pathMatches(pathname, item.href)
  )
  const isSteeringActive = steeringItems.some((item) =>
    pathMatches(pathname, item.href)
  )
  const isToolsActive = toolsItems.some((item) =>
    pathMatches(pathname, item.href)
  )

  const NavItem = ({ href, label }: NavLink) => {
    const isActive = pathMatches(pathname, href)

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

  const DropdownLink = ({ item }: { item: NavLink }) => {
    const isActive = pathMatches(pathname, item.href)

    return (
      <Link href={item.href}>
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
  }

  const SectionMenu = ({
    label,
    items,
    active,
  }: {
    label: string
    items: NavLink[]
    active: boolean
  }) => (
    <DropdownMenu
      hoverEnabled
      trigger={
        <Button
          variant={active ? 'primary' : 'nav'}
          size="sm"
          className={cn(
            'gap-1 whitespace-nowrap transition-all',
            active && 'ring-2 ring-accent/20'
          )}
        >
          {label}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      }
    >
      {items.map((item) => (
        <DropdownLink key={item.href} item={item} />
      ))}
    </DropdownMenu>
  )

  const ToolsMenu = () => (
    <DropdownMenu
      hoverEnabled
      className="w-72"
      trigger={
        <Button
          variant={isToolsActive ? 'primary' : 'nav'}
          size="sm"
          className={cn(
            'gap-1 whitespace-nowrap transition-all',
            isToolsActive && 'ring-2 ring-accent/20'
          )}
        >
          Outils
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      }
    >
      {toolGroups.map((group, index) => (
        <div key={group.label}>
          {index > 0 && <DropdownMenuSeparator />}
          <div className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            {group.label}
          </div>
          {group.items.map((item) => (
            <DropdownLink key={item.href} item={item} />
          ))}
        </div>
      ))}
    </DropdownMenu>
  )

  const mobilePrimaryItems = [
    { href: '/today', label: "Aujourd'hui", icon: Home },
    { href: '/planning', label: 'Planning', icon: CalendarDays },
    { href: '/cold-call', label: 'Prospection', icon: Target },
    { href: '/pipeline', label: 'Opportunités', icon: CircleDot },
  ]

  return (
    <>
      <nav className="hidden lg:block border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center shrink-0">
            <Logo size="md" />
          </Link>

          <div className="hidden lg:flex min-w-0 items-center gap-1.5 mx-1 lg:mx-6">
            <div className="hidden 2xl:flex items-center gap-1.5">
              {dailyItems.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}

              <SectionMenu
                label="Opportunités"
                items={opportunitiesItems}
                active={isOpportunitiesActive}
              />

              <NavItem href="/relationships" label="Réseau" />

              <SectionMenu
                label="Clients & contacts"
                items={clientsItems}
                active={isClientsActive}
              />

              <SectionMenu
                label="Pilotage"
                items={steeringItems}
                active={isSteeringActive}
              />

              <ToolsMenu />
            </div>

            <div className="hidden lg:flex 2xl:hidden items-center gap-1.5">
              <NavItem href="/today" label="Aujourd'hui" />
              <NavItem href="/planning" label="Planning" />
              <NavItem href="/cold-call" label="Prospection" />
              <SectionMenu
                label="Opportunités"
                items={opportunitiesItems}
                active={isOpportunitiesActive}
              />
              <DropdownMenu
                trigger={
                  <Button
                    variant={
                      pathMatches(pathname, '/relationships') ||
                      isClientsActive ||
                      isSteeringActive ||
                      isToolsActive
                        ? 'primary'
                        : 'nav'
                    }
                    size="sm"
                    className="gap-1 whitespace-nowrap"
                  >
                    Plus
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                }
              >
                <DropdownLink item={{ href: '/relationships', label: 'Réseau' }} />
                <DropdownMenuSeparator />
                <div className="px-4 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Clients & contacts
                </div>
                {clientsItems.map((item) => (
                  <DropdownLink key={item.href} item={item} />
                ))}
                <DropdownMenuSeparator />
                <div className="px-4 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Pilotage
                </div>
                {steeringItems.map((item) => (
                  <DropdownLink key={item.href} item={item} />
                ))}
                <DropdownMenuSeparator />
                <div className="px-4 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Outils
                </div>
                {toolsItems.map((item) => (
                  <DropdownLink key={item.href} item={item} />
                ))}
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <CreateMenu />
            <UserMenuV2 userEmail={userEmail} userName={userName} />
          </div>
        </div>
      </nav>

      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-[70] border-t border-border bg-card safe-bottom shadow-[0_-8px_24px_rgba(0,0,0,0.18)]">
        <div className="grid grid-cols-5">
          {mobilePrimaryItems.map((item) => {
            const Icon = item.icon
            const active =
              item.href === '/pipeline'
                ? isOpportunitiesActive
                : pathMatches(pathname, item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] transition-colors',
                  active ? 'text-accent' : 'text-text-muted'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate max-w-full">{item.label}</span>
              </Link>
            )
          })}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className={cn(
              'flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] transition-colors',
              mobileMenuOpen ||
                pathMatches(pathname, '/relationships') ||
                isClientsActive ||
                isSteeringActive ||
                isToolsActive
                ? 'text-accent'
                : 'text-text-muted'
            )}
            aria-expanded={mobileMenuOpen}
            aria-label="Ouvrir le menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span>Menu</span>
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fermer le menu"
          />
          <div className="absolute inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] max-h-[70dvh] overflow-y-auto rounded-t-2xl border border-border bg-card p-4 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/prospects"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl border border-border bg-background p-3 text-sm font-medium"
              >
                Opportunités · Liste
              </Link>
              <Link
                href="/relationships"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl border border-border bg-background p-3 text-sm font-medium"
              >
                Réseau
              </Link>
              <Link
                href="/companies"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl border border-border bg-background p-3 text-sm font-medium"
              >
                Entreprises
              </Link>
              <Link
                href="/contacts"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl border border-border bg-background p-3 text-sm font-medium"
              >
                Contacts
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl border border-border bg-background p-3 text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/analytics"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl border border-border bg-background p-3 text-sm font-medium"
              >
                Analytics
              </Link>
            </div>

            <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Outils
            </div>
            <div className="mt-2 grid grid-cols-1 gap-1">
              {toolsItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm',
                    pathMatches(pathname, item.href)
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'hover:bg-accent/10'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
