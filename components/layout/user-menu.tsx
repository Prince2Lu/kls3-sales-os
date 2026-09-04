// User menu component with logout
// Phase 8: Discrete user session display and logout control

'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

interface UserMenuProps {
  userEmail?: string | null
}

export function UserMenu({ userEmail }: UserMenuProps) {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="flex items-center gap-3">
      {/* User email (discrete) */}
      {userEmail && (
        <span className="text-xs text-text-muted hidden sm:inline">
          {userEmail}
        </span>
      )}

      {/* Logout button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="gap-2"
        title="Se déconnecter"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden md:inline">Déconnexion</span>
      </Button>
    </div>
  )
}
