'use client'

// Multichannel prospecting action menu
// Allows recording EMAIL_SENT, EMAIL_REPLY, LINKEDIN_SENT, LINKEDIN_REPLY

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface MultichannelActionMenuProps {
  onEmailSent: () => void
  onEmailReply: () => void
  onLinkedInSent: () => void
  onLinkedInReply: () => void
  onCancel: () => void
}

export function MultichannelActionMenu({
  onEmailSent,
  onEmailReply,
  onLinkedInSent,
  onLinkedInReply,
  onCancel,
}: MultichannelActionMenuProps) {
  return (
    <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center">
      <Card className="max-w-sm w-full p-4 space-y-3">
        <div>
          <h3 className="text-lg font-bold font-syne">Action prospection</h3>
          <p className="text-xs text-text-muted mt-1">
            Enregistrer une action multicanale
          </p>
        </div>

        <div className="space-y-1">
          {/* Email Section */}
          <div className="pt-2">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-1 px-3">
              Email
            </div>
            <Button
              onClick={onEmailSent}
              variant="ghost"
              className="w-full justify-start"
            >
              📧 Email envoyé
            </Button>
            <Button
              onClick={onEmailReply}
              variant="ghost"
              className="w-full justify-start"
            >
              ✉️ Réponse email reçue
            </Button>
          </div>

          {/* LinkedIn Section */}
          <div className="pt-2">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-1 px-3">
              LinkedIn
            </div>
            <Button
              onClick={onLinkedInSent}
              variant="ghost"
              className="w-full justify-start"
            >
              💼 Message LinkedIn envoyé
            </Button>
            <Button
              onClick={onLinkedInReply}
              variant="ghost"
              className="w-full justify-start"
            >
              🔵 Réponse LinkedIn reçue
            </Button>
          </div>
        </div>

        <Button onClick={onCancel} variant="ghost" className="w-full">
          Annuler
        </Button>
      </Card>
    </div>
  )
}
