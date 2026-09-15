'use client'

// Shared component for displaying contact information on cards

import type { Contact, Company } from '@/types/domain'

interface ContactInfoProps {
  contact?: Contact | null
  company?: Company
  compact?: boolean
}

export function ContactInfo({ contact, company, compact = false }: ContactInfoProps) {
  if (!contact && !company) return null

  const phoneNumber = contact?.phone || company?.phone || null
  const email = contact?.email || null
  const website = company?.website || null

  if (compact) {
    // Ultra-compact version for small cards
    return (
      <div className="text-xs space-y-1">
        {contact && (
          <div className="text-text-muted truncate">
            {contact.firstName} {contact.lastName}
            {contact.jobTitle && <span className="text-text-muted/60"> · {contact.jobTitle}</span>}
          </div>
        )}

        {phoneNumber && (
          <a
            href={`tel:${phoneNumber}`}
            className="font-mono text-accent hover:underline block truncate"
            onClick={(e) => e.stopPropagation()}
            title={phoneNumber}
          >
            📞 {phoneNumber}
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="text-xs space-y-1.5">
      {/* Contact Name + Job Title */}
      {contact && (
        <div className="space-y-0.5">
          <div className="font-medium">
            {contact.firstName} {contact.lastName}
          </div>
          {contact.jobTitle && (
            <div className="text-text-muted italic text-[11px]">{contact.jobTitle}</div>
          )}
        </div>
      )}

      {/* Phone */}
      {phoneNumber && (
        <div>
          <a
            href={`tel:${phoneNumber}`}
            className="font-mono text-accent hover:underline inline-flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
            title="Appeler"
          >
            📞 {phoneNumber}
          </a>
        </div>
      )}

      {/* Email */}
      {email && (
        <div>
          <a
            href={`mailto:${email}`}
            className="text-accent hover:underline inline-flex items-center gap-1 truncate max-w-full"
            onClick={(e) => e.stopPropagation()}
            title={email}
          >
            ✉️ <span className="truncate">{email}</span>
          </a>
        </div>
      )}

      {/* Website */}
      {website && (
        <div>
          <a
            href={website.startsWith('http') ? website : `https://${website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline inline-flex items-center gap-1 truncate max-w-full"
            onClick={(e) => e.stopPropagation()}
            title={website}
          >
            🌐 <span className="truncate">{website.replace(/^https?:\/\//, '')}</span>
          </a>
        </div>
      )}
    </div>
  )
}
