export type BrevoSendMode = 'disabled' | 'test' | 'live'

export function isNotaryImportEnabled(): boolean {
  return process.env.NOTARY_IMPORT_ENABLED === 'true'
}

export function getBrevoSendMode(): BrevoSendMode {
  const value = process.env.BREVO_SEND_MODE?.toLowerCase()
  return value === 'test' || value === 'live' ? value : 'disabled'
}

export function getBrevoTestRecipientEmail(): string | null {
  const email = process.env.BREVO_TEST_RECIPIENT_EMAIL?.trim().toLowerCase()
  return email || null
}
