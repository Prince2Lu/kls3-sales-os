'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu } from 'lucide-react'
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

  const MobileMenu = () => {
    const trigger = (
      <Button
        variant="nav"
        size="sm"
        className="gap-1.5 whitespace-nowrap"
      >
        <Menu className="w-4 h-4" />
        <span>Menu</span>
      </Button>
    )

    const MobileSection = ({
      label,
      items,
      open = false,
    }: {
      label: string
      items: NavLink[]
      open?: boolean
    }) => (
      <details className="border-t border-border/70" open={open}>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2 text-sm font-medium">
          <span>{label}</span>
          <ChevronDown className="h-4 w-4" />
        </summary>
        <div className="border-t border-border/40 pl-3">
          {items.map((item) => (
            <DropdownLink key={item.href} item={item} />
          ))}
        </div>
      </details>
    )

    return (
      <DropdownMenu
        trigger={trigger}
        align="left"
        className="w-[min(21rem,calc(100vw-1rem))]"
      >
        <div className="py-1">
          {dailyItems.map((item) => (
            <DropdownLink key={item.href} item={item} />
          ))}

          <MobileSection
            label="Opportunités"
            items={opportunitiesItems}
            open={isOpportunitiesActive}
          />

          <div className="border-t border-border/70">
            <DropdownLink item={{ href: '/relationships', label: 'Réseau' }} />
          </div>

          <MobileSection
            label="Clients & contacts"
            items={clientsItems}
            open={isClientsActive}
          />

          <MobileSection
            label="Pilotage"
            items={steeringItems}
            open={isSteeringActive}
          />

          <details className="border-t border-border/70" open={isToolsActive}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2 text-sm font-medium">
              <span>Outils</span>
              <ChevronDown className="h-4 w-4" />
            </summary>
            <div className="border-t border-border/40 pb-1">
              {toolGroups.map((group, index) => (
                <div key={group.label}>
                  {index > 0 && <DropdownMenuSeparator />}
                  <div className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    {group.label}
                  </div>
                  <div className="pl-3">
                    {group.items.map((item) => (
                      <DropdownLink key={item.href} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </DropdownMenu>
    )
  }

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center shrink-0">
          <Logo size="md" />
        </Link>

        <div className="flex min-w-0 items-center gap-1.5 mx-1 lg:mx-6">
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

          <div className="lg:hidden">
            <MobileMenu />
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <CreateMenu />
          <UserMenuV2 userEmail={userEmail} userName={userName} />
        </div>
      </div>
    </nav>
  )
}
