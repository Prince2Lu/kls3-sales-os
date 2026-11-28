// Reads reply headers from an owner's INBOX over IMAP (Trello #65).
// Read-only: EXAMINE + BODY.PEEK, so no message is marked as read or changed.

import {
  connectTls,
  createLineReader,
  imapQuote,
  writeLine,
  type MailAccount,
} from '@/lib/direct-email/mailer'
import {
  REPLY_HEADER_FIELDS,
  imapSinceDate,
  parseImapHeaderFetch,
  type FetchedMessage,
} from '@/lib/email-replies/reply-matcher'

/** Keeps one run bounded on a busy mailbox. */
const MAX_MESSAGES_PER_RUN = 300

export async function fetchInboxHeadersSince(account: MailAccount, since: Date): Promise<FetchedMessage[]> {
  if (!account.imapSecure) throw new Error('IMAP doit être configuré en TLS implicite.')

  const socket = await connectTls(account.imapHost, account.imapPort)
  const readLine = createLineReader(socket)

  const collect = async (tag: string): Promise<string[]> => {
    const lines: string[] = []
    while (true) {
      const line = await readLine(30000)
      if (line.startsWith(`${tag} OK`)) return lines
      if (line.startsWith(`${tag} NO`) || line.startsWith(`${tag} BAD`)) throw new Error(`IMAP ${tag}: ${line.slice(tag.length + 1, 120)}`)
      lines.push(line)
    }
  }

  try {
    const greeting = await readLine()
    if (!greeting.startsWith('* OK')) throw new Error('IMAP: connexion refusée.')

    writeLine(socket, `R001 LOGIN ${imapQuote(account.imapUser)} ${imapQuote(account.imapPassword)}`)
    await collect('R001')

    writeLine(socket, 'R002 EXAMINE INBOX')
    await collect('R002')

    writeLine(socket, `R003 UID SEARCH SINCE ${imapSinceDate(since)}`)
    const search = await collect('R003')
    const uids = search
      .filter((line) => line.startsWith('* SEARCH'))
      .flatMap((line) => line.slice('* SEARCH'.length).trim().split(/\s+/))
      .filter(Boolean)
      .slice(-MAX_MESSAGES_PER_RUN)

    let messages: FetchedMessage[] = []
    if (uids.length) {
      writeLine(socket, `R004 UID FETCH ${uids.join(',')} (UID BODY.PEEK[HEADER.FIELDS (${REPLY_HEADER_FIELDS.join(' ')})])`)
      messages = parseImapHeaderFetch(await collect('R004'))
    }

    writeLine(socket, 'R005 LOGOUT')
    return messages
  } finally {
    socket.end()
  }
}
