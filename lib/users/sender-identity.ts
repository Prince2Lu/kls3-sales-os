// Who an email is sent "as": name, address and job title of a Sales OS user.
// Source order: the user's digital card (public, business identity), then the
// USERS row, then the owner name itself. No first name is coded here (Trello #53).

import { getUsers } from '@/lib/airtable'
import { getDigitalCardBySlug, type DigitalCard } from '@/lib/digital-cards'
import type { User } from '@/types/domain'

export type SenderIdentity = {
  name: string
  email: string
  title: string
}

type CardIdentity = Pick<DigitalCard, 'displayName' | 'firstName' | 'lastName' | 'email' | 'title'>
type UserIdentity = Pick<User, 'name' | 'firstName' | 'lastName' | 'email'>

function fullName(first: string | null | undefined, last: string | null | undefined): string {
  return [first, last].filter(Boolean).join(' ').trim()
}

/** Pure: picks the best available value for each part of the identity. */
export function resolveSenderIdentity(
  owner: string,
  user: UserIdentity | null,
  card: CardIdentity | null
): SenderIdentity {
  const name =
    card?.displayName?.trim() ||
    fullName(card?.firstName, card?.lastName) ||
    fullName(user?.firstName, user?.lastName) ||
    user?.name?.trim() ||
    owner

  return {
    name,
    email: (card?.email || user?.email || '').trim().toLowerCase(),
    title: card?.title?.trim() || '',
  }
}

/** Digital cards use the lower-cased owner name as slug (see /carte/[slug]). */
export function cardSlugFor(owner: string): string {
  return owner.trim().toLowerCase()
}

export async function getSenderIdentity(owner: string): Promise<SenderIdentity> {
  const [users, card] = await Promise.all([
    getUsers().catch(() => []),
    getDigitalCardBySlug(cardSlugFor(owner), { includeInactive: true }).catch(() => null),
  ])
  const user = users.find((item) => item.name === owner) ?? null
  return resolveSenderIdentity(owner, user, card)
}
