import type { Owner } from '@/types/domain'

export type DirectMailDraftInput = {
  owner: Owner
  toEmail: string
  subject: string
  body: string
  cardUrl: string
}

function identity(owner: Owner) {
  return owner === 'Eric'
    ? { name: 'Eric Scarpino', title: 'Directeur de missions' }
    : { name: 'Lilian Scarpino', title: 'Directeur commercial' }
}

export function buildDirectMailto(input: DirectMailDraftInput) {
  const sender = identity(input.owner)
  const fullBody = [
    input.body.trim(),
    '',
    'Cordialement,',
    sender.name,
    `${sender.title} — KLS3`,
    '',
    `Ma carte digitale : ${input.cardUrl}`,
  ].join('\n')

  const params = new URLSearchParams({
    subject: input.subject,
    body: fullBody,
  })

  return `mailto:${encodeURIComponent(input.toEmail)}?${params.toString()}`
}
