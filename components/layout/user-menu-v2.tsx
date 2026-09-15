// Enhanced user menu with avatar and dropdown
// Replaces user-menu.tsx with more professional, compact design

'use client'

import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface UserMenuV2Props {
  userEmail?: string | null
  userName?: string | null
}

export function UserMenuV2({ userEmail, userName }: UserMenuV2Props) {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  // Extract first name from email if no userName provided
  const displayName =
    userName || userEmail?.split('@')[0] || 'Utilisateur'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const trigger = (
    <button className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-accent/10 transition-colors">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-semibold text-accent">
        {initials}
      </div>

      {/* Name (hidden on small screens) */}
      <span className="text-sm text-text-primary hidden lg:inline whitespace-nowrap">
        {displayName}
      </span>
    </button>
  )

  return (
    <DropdownMenu trigger={trigger} align="right">
      {/* User info */}
      <div className="px-4 py-3 border-b border-border">
        <div className="text-sm font-medium text-text-primary">
          {displayName}
        </div>
        {userEmail && (
          <div className="text-xs text-text-muted mt-0.5">{userEmail}</div>
        )}
      </div>

      {/* Logout */}
      <DropdownMenuItem onClick={handleSignOut} destructive>
        <div className="flex items-center gap-2">
          <LogOut className="w-4 h-4" />
          <span>Se déconnecter</span>
        </div>
      </DropdownMenuItem>
    </DropdownMenu>
  )
}
