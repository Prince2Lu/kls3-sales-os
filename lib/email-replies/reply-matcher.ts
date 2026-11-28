// Detects replies to direct emails sent from Sales OS (Trello #65).
// Pure functions: no network, no Airtable. A reply is matched only through the
// In-Reply-To / References headers pointing to the Message-ID that Sales OS
// generated when sending; subject or sender guesses are never used.

export type MailHeaders = Record<string, string>

export type FetchedMessage = {
  uid: number
  headers: MailHeaders
}

export type SentDirectEmail = {
  id: string
  contactId: string | null
  owner: string
  subject: string
  messageId: string
}

export type DetectedReply = {
  sentEmail: SentDirectEmail
  replyMessageId: string
  from: string
  subject: string
  receivedAt: string | null
}

/** Headers fetched over IMAP, upper-case as IMAP expects them. */
export const REPLY_HEADER_FIELDS = [
  'MESSAGE-ID',
  'IN-REPLY-TO',
  'REFERENCES',
  'FROM',
  'SUBJECT',
  'DATE',
  'AUTO-SUBMITTED',
  'X-AUTOREPLY',
  'X-AUTORESPOND',
  'X-AUTO-RESPONSE-SUPPRESS',
  'PRECEDENCE',
] as const

/** Parses an RFC 5322 header block (with folded lines) into lower-case keys. */
export function parseHeaders(block: string): MailHeaders {
  const headers: MailHeaders = {}
  let current = ''
  for (const rawLine of block.split(/\r?\n/)) {
    if (/^[ \t]/.test(rawLine) && current) {
      headers[current] += ` ${rawLine.trim()}`
      continue
    }
    const index = rawLine.indexOf(':')
    if (index <= 0) continue
    current = rawLine.slice(0, index).trim().toLowerCase()
    const value = rawLine.slice(index + 1).trim()
    headers[current] = headers[current] ? `${headers[current]} ${value}` : value
  }
  return headers
}

/**
 * Splits the untagged lines of a `UID FETCH ... BODY.PEEK[HEADER.FIELDS (...)]`
 * answer into one header block per message.
 */
export function parseImapHeaderFetch(lines: string[]): FetchedMessage[] {
  const messages: FetchedMessage[] = []
  let uid: number | null = null
  let block: string[] = []

  const flush = () => {
    if (uid !== null) messages.push({ uid, headers: parseHeaders(block.join('\r\n')) })
    uid = null
    block = []
  }

  for (const line of lines) {
    const start = /^\* \d+ FETCH \(.*\bUID (\d+)/i.exec(line)
    if (start) {
      flush()
      uid = Number(start[1])
      continue
    }
    if (uid === null) continue
    if (line === ')' || /^\S+ (OK|NO|BAD)\b/.test(line)) continue
    block.push(line)
  }
  flush()
  return messages
}

/** Message-IDs found in a header value, normalised to lower case with brackets. */
export function extractMessageIds(value: string | undefined): string[] {
  if (!value) return []
  return Array.from(value.matchAll(/<[^<>\s]+>/g), (match) => match[0].toLowerCase())
}

/** Out-of-office and other machine replies are not a real answer from the prospect. */
export function isAutomatedReply(headers: MailHeaders): boolean {
  const autoSubmitted = (headers['auto-submitted'] ?? '').toLowerCase()
  if (autoSubmitted && autoSubmitted !== 'no') return true
  if (headers['x-autoreply'] || headers['x-autorespond']) return true
  const precedence = (headers.precedence ?? '').toLowerCase()
  return ['auto_reply', 'bulk', 'junk', 'list'].includes(precedence)
}

export function emailAddress(from: string | undefined): string {
  if (!from) return ''
  const bracket = /<([^<>\s]+@[^<>\s]+)>/.exec(from)
  const bare = /([^\s<>"]+@[^\s<>"]+)/.exec(from)
  return (bracket?.[1] ?? bare?.[1] ?? '').toLowerCase()
}

/** Marker written in Activity notes so that a reply is never logged twice. */
export function replyMarker(replyMessageId: string): string {
  return `[DIRECT_REPLY:${replyMessageId.toLowerCase()}]`
}

export function matchDirectReplies(input: {
  messages: FetchedMessage[]
  sentEmails: SentDirectEmail[]
  ownAddress: string
}): DetectedReply[] {
  const byMessageId = new Map<string, SentDirectEmail>()
  for (const email of input.sentEmails) {
    const id = extractMessageIds(email.messageId)[0]
    if (id) byMessageId.set(id, email)
  }

  const ownAddress = input.ownAddress.toLowerCase()
  const seen = new Set<string>()
  const replies: DetectedReply[] = []

  for (const message of input.messages) {
    const headers = message.headers
    const replyMessageId = extractMessageIds(headers['message-id'])[0]
    if (!replyMessageId || seen.has(replyMessageId)) continue
    if (isAutomatedReply(headers)) continue

    const from = emailAddress(headers.from)
    if (!from || from === ownAddress) continue

    const linked = [...extractMessageIds(headers['in-reply-to']), ...extractMessageIds(headers.references)]
    const sentEmail = linked.map((id) => byMessageId.get(id)).find(Boolean)
    if (!sentEmail) continue

    seen.add(replyMessageId)
    const date = headers.date ? new Date(headers.date) : null
    replies.push({
      sentEmail,
      replyMessageId,
      from,
      subject: decodeMimeWords(headers.subject ?? ''),
      receivedAt: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
    })
  }

  return replies
}

/** Decodes RFC 2047 encoded words (=?UTF-8?B?...?= / =?UTF-8?Q?...?=) for display. */
export function decodeMimeWords(value: string): string {
  return value
    .replace(/(\?=)\s+(=\?)/g, '$1$2')
    .replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (whole, charset: string, encoding: string, data: string) => {
      try {
        const bytes = encoding.toUpperCase() === 'B'
          ? Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
          : Uint8Array.from(
              data.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})|[\s\S]/g, (m, hex) => (hex ? String.fromCharCode(parseInt(hex, 16)) : m)),
              (c) => c.charCodeAt(0)
            )
        return new TextDecoder(charset.toLowerCase() === 'utf8' ? 'utf-8' : charset).decode(bytes)
      } catch {
        return whole
      }
    })
}

/** IMAP SEARCH date, e.g. 21-Nov-2026. */
export function imapSinceDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${date.getUTCDate()}-${months[date.getUTCMonth()]}-${date.getUTCFullYear()}`
}
