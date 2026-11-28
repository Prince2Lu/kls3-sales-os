// Logs replies to Sales OS direct emails in the CRM (Trello #65).
// For each reply found in the sender's INBOX: one EMAIL activity (result EMAIL_REPLY)
// on the contact, and an URGENT follow-up task to read and qualify it.
// No Opportunity is ever created here: a reply is a signal, not a conversion.

import { createActivity, createTask, getActivities, getColdCallTargets, getTasks, updateTask } from '@/lib/airtable'
import { listDirectEmails } from '@/lib/direct-email/data'
import { accountFor } from '@/lib/direct-email/mailer'
import { fetchInboxHeadersSince } from '@/lib/email-replies/imap-inbox'
import { matchDirectReplies, replyMarker, type DetectedReply, type SentDirectEmail } from '@/lib/email-replies/reply-matcher'
import { getActiveOwners } from '@/lib/users/owners'
import { emailReplyFollowUpDueParis } from '@/lib/utils/business-day'

/** Replies are looked for on emails sent during the last 30 days. */
export const REPLY_WINDOW_DAYS = 30

export type ReplySyncOwnerResult = {
  owner: string
  checked: boolean
  found: number
  logged: number
  error?: string
}

export type ReplySyncResult = {
  owners: ReplySyncOwnerResult[]
  logged: number
}

export async function syncDirectEmailReplies(options: { owners?: string[]; now?: Date } = {}): Promise<ReplySyncResult> {
  const now = options.now ?? new Date()
  const windowStart = new Date(now.getTime() - REPLY_WINDOW_DAYS * 24 * 3600 * 1000)
  const owners = options.owners ?? (await getActiveOwners())

  const sent = (await listDirectEmails()).filter(
    (email) => email.status === 'SENT' && email.messageId && email.sentAt && new Date(email.sentAt) >= windowStart
  )

  const results: ReplySyncOwnerResult[] = []
  const detected: DetectedReply[] = []

  for (const owner of owners) {
    const ownerSent: SentDirectEmail[] = sent
      .filter((email) => email.owner === owner)
      .map((email) => ({ id: email.id, contactId: email.contactId, owner: email.owner, subject: email.subject, messageId: email.messageId }))
    if (!ownerSent.length) {
      results.push({ owner, checked: false, found: 0, logged: 0 })
      continue
    }

    try {
      const account = await accountFor(owner)
      const oldest = sent
        .filter((email) => email.owner === owner)
        .reduce((min, email) => Math.min(min, new Date(email.sentAt as string).getTime()), now.getTime())
      const messages = await fetchInboxHeadersSince(account, new Date(oldest))
      const replies = matchDirectReplies({ messages, sentEmails: ownerSent, ownAddress: account.fromEmail })
      detected.push(...replies)
      results.push({ owner, checked: true, found: replies.length, logged: 0 })
    } catch (error) {
      results.push({ owner, checked: false, found: 0, logged: 0, error: error instanceof Error ? error.message : 'Lecture de la boîte impossible.' })
    }
  }

  if (!detected.length) return { owners: results, logged: 0 }

  const [activities, openTasks, targets] = await Promise.all([
    getActivities(),
    getTasks({ status: 'TODO' }),
    getColdCallTargets(),
  ])
  const knownNotes = activities.map((activity) => activity.notes ?? '')

  let logged = 0
  for (const reply of detected) {
    const marker = replyMarker(reply.replyMessageId)
    if (knownNotes.some((notes) => notes.includes(marker))) continue

    const contactId = reply.sentEmail.contactId
    const owner = reply.sentEmail.owner
    const openTargets = contactId
      ? targets.filter((target) => target.contactId === contactId && !target.archived)
      : []
    const target = openTargets.length === 1 ? openTargets[0] : null

    await createActivity({
      contactId: contactId ?? undefined,
      coldCallTargetId: target?.id,
      opportunityId: target?.opportunityId ?? undefined,
      type: 'EMAIL',
      date: reply.receivedAt ?? now.toISOString(),
      result: 'EMAIL_REPLY',
      notes: `${marker} Réponse reçue de ${reply.from} à l'email « ${reply.sentEmail.subject} »${reply.subject ? ` — objet : ${reply.subject}` : ''}`,
      owner,
    })
    knownNotes.push(marker)

    const due = emailReplyFollowUpDueParis(now).toISOString()
    const existing = contactId
      ? openTasks.find((task) => task.contactId === contactId && ['CALL', 'FOLLOW_UP', 'EMAIL'].includes(task.type))
      : undefined
    if (existing) {
      await updateTask(existing.id, {
        priority: 'URGENT',
        dueAt: due,
        notes: `${existing.notes ?? ''}\n${marker} Réponse email reçue à lire et qualifier.`.trim(),
      })
    } else {
      const task = await createTask({
        contactId: contactId ?? undefined,
        coldCallTargetId: target?.id,
        opportunityId: target?.opportunityId ?? undefined,
        type: 'FOLLOW_UP',
        dueAt: due,
        priority: 'URGENT',
        status: 'TODO',
        notes: `${marker} Réponse à « ${reply.sentEmail.subject} ». Lire et qualifier avant de créer une opportunité.`,
        owner,
      })
      openTasks.push(task)
    }

    logged += 1
    const ownerResult = results.find((result) => result.owner === owner)
    if (ownerResult) ownerResult.logged += 1
  }

  return { owners: results, logged }
}
