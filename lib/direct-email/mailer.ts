import nodemailer from 'nodemailer'
import { ImapFlow } from 'imapflow'
import type { Owner } from '@/types/domain'

export type DirectMailSendInput = {
  owner: Owner
  toEmail: string
  subject: string
  body: string
  cardUrl: string
}

export function directMailConfigured(owner: Owner) {
  const prefix = `MAIL_${owner.toUpperCase()}_`
  return Boolean(
    process.env[`${prefix}FROM_EMAIL`] &&
    process.env[`${prefix}SMTP_HOST`] &&
    process.env[`${prefix}SMTP_PASSWORD`] &&
    process.env[`${prefix}IMAP_HOST`]
  )
}
