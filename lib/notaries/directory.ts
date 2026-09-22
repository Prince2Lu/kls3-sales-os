export interface NotaryDirectoryCandidate {
  sourceId: string
  sourceUrl: string
  name: string
  addressLine1: string
  postalCode: string
  city: string
  phone: string
  email: string
  website: string
  notaries: Array<{ firstName: string; lastName: string }>
}

const DIRECTORY_ORIGINS = [
  'https://chambre-interdep-08-10-51.notaires.fr',
  'https://chambre-bas-rhin.notaires.fr',
]

function decodeHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function match(html: string, pattern: RegExp): string {
  return decodeHtml(html.match(pattern)?.[1] ?? '')
}

function splitPersonName(label: string): { firstName: string; lastName: string } {
  const cleaned = label.replace(/^(Maître|Me)\s+/i, '').trim()
  const parts = cleaned.split(/\s+/)
  if (parts.length === 1) return { firstName: '', lastName: parts[0] }

  // L'annuaire affiche généralement NOM Prénom.
  const firstMixedCaseIndex = parts.findIndex((part) => /[a-zà-ÿ]/.test(part.slice(1)))
  const pivot = firstMixedCaseIndex > 0 ? firstMixedCaseIndex : parts.length - 1
  return {
    firstName: parts.slice(pivot).join(' '),
    lastName: parts.slice(0, pivot).join(' '),
  }
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'KLS3-Sales-OS/1.0 (directory import)' },
    next: { revalidate: 86400 },
  })
  if (!response.ok) throw new Error(`Annuaire indisponible (${response.status})`)
  return response.text()
}

async function fetchCandidate(origin: string, path: string): Promise<NotaryDirectoryCandidate | null> {
  const sourceUrl = `${origin}${path}`
  const html = await fetchHtml(sourceUrl)
  const name = match(html, /<p class="font-bold text-xl[^>]*>([\s\S]*?)<\/p>/i)
  const contactBlock = html.slice(html.search(/Adresse\s*:<\/p>/i), html.search(/<ul class="notaires-color2-color">/i))
  const addressLine1 = match(html, /Adresse\s*:<\/p>\s*<p>([\s\S]*?)<\/p>/i)
  const location = match(html, /Adresse\s*:<\/p>[\s\S]*?<\/p>\s*<p>([\s\S]*?)<\/p>/i)
  const locationMatch = location.match(/(\d{5})\s+(.+)/)
  const email = match(contactBlock, /href="mailto:([^"?]+)"/i).toLowerCase()
  const phone = match(contactBlock, /href="tel:([^"]+)"/i)
  const website = match(contactBlock, /<a[^>]+href="(https?:\/\/[^" ]+)"[^>]*>\s*Site Web/i)
  const notaryBlock = html.match(/<ul class="notaires-color2-color">([\s\S]*?)<\/ul>/i)?.[1] ?? ''
  const labels = Array.from(notaryBlock.matchAll(/<a[^>]+href="[^"]+\/IDN[^"/]+I"[^>]*>([\s\S]*?)<\/a>/gi))
    .map((item) => decodeHtml(item[1]))
    .filter(Boolean)

  if (!name || !locationMatch || labels.length === 0) return null
  return {
    sourceId: `${new URL(origin).hostname}:${path.split('/').pop() ?? path}`,
    sourceUrl,
    name,
    addressLine1,
    postalCode: locationMatch[1],
    city: locationMatch[2],
    phone,
    email,
    website,
    notaries: labels.map(splitPersonName),
  }
}

export async function getNotaryPilotCandidates(input?: {
  limit?: number
  minNotaries?: number
  maxNotaries?: number
}): Promise<NotaryDirectoryCandidate[]> {
  const limit = Math.min(Math.max(input?.limit ?? 25, 1), 50)
  const minNotaries = input?.minNotaries ?? 3
  const maxNotaries = input?.maxNotaries ?? 10
  const sources = new Map<string, { origin: string; path: string }>()

  const resultPages = await Promise.all(DIRECTORY_ORIGINS.flatMap((origin) => Array.from({ length: 8 }, (_, page) =>
    fetchHtml(`${origin}/annuaire-notaires?displayList=0&page=${page}`).then((html) => ({ origin, html }))
  )))
  for (const { origin, html } of resultPages) {
    for (const found of html.matchAll(/href="(?:https:\/\/[^"/]+)?(\/annuaire-notaires\/IDN\d+_00)"/g)) {
      sources.set(`${origin}${found[1]}`, { origin, path: found[1] })
    }
  }

  const candidates: NotaryDirectoryCandidate[] = []
  const allSources = Array.from(sources.values())
  for (let index = 0; index < allSources.length && candidates.length < limit; index += 16) {
    const batch = await Promise.all(allSources.slice(index, index + 16).map(({ origin, path }) => fetchCandidate(origin, path).catch(() => null)))
    for (const candidate of batch) {
      if (candidate && candidate.notaries.length >= minNotaries && candidate.notaries.length <= maxNotaries) {
        candidates.push(candidate)
        if (candidates.length === limit) break
      }
    }
  }

  return candidates
}
