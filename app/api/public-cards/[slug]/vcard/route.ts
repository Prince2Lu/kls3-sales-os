import {
  getDigitalCardBySlug,
  buildVCard,
  type EmbeddedVCardPhoto,
} from '@/lib/digital-cards'
import { recordCardEvent } from '@/lib/card-analytics'

export const dynamic = 'force-dynamic'

async function loadPhoto(
  url: string,
  declaredMimeType = ''
): Promise<EmbeddedVCardPhoto | undefined> {
  if (!url) return undefined

  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) return undefined

    const contentType = (
      declaredMimeType || response.headers.get('content-type') || ''
    ).toLowerCase()
    const type: EmbeddedVCardPhoto['type'] =
      contentType.includes('png')
        ? 'PNG'
        : contentType.includes('webp')
          ? 'WEBP'
          : 'JPEG'

    const bytes = new Uint8Array(await response.arrayBuffer())
    return {
      type,
      base64: Buffer.from(bytes).toString('base64'),
    }
  } catch {
    return undefined
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const card = await getDigitalCardBySlug(slug)

  if (!card) {
    return new Response('Not found', { status: 404 })
  }

  const filename = (card.displayName || slug)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const url = new URL(request.url)
  const userAgent = request.headers.get('user-agent') || ''
  const requestedPlatform = url.searchParams.get('platform') || ''
  const androidLike =
    requestedPlatform === 'android' ||
    /Android|SamsungBrowser|Huawei|Xiaomi|OPPO|OnePlus/i.test(userAgent)

  const photo = androidLike
    ? undefined
    : await loadPhoto(
        card.photoVCardUrl || card.photoUrl,
        card.photoMimeType
      )
  const source = url.searchParams.get('src') || 'direct'
  const campaign = url.searchParams.get('campaign') || ''
  const visitorId = url.searchParams.get('visitor') || ''
  const cardRef = url.searchParams.get('ref') || ''

  // Analytics must never block the contact download.
  void recordCardEvent({
    cardSlug: card.slug,
    eventType: 'vcard_download',
    visitorId,
    source,
    campaign,
    pageReferrer: request.headers.get('referer') || '',
    cardRef,
  }).catch(() => undefined)

  return new Response(
    buildVCard(card, photo, { compatibilityMode: androidLike }),
    {
    status: 200,
    headers: {
      'Content-Type': androidLike
        ? 'text/x-vcard; charset=utf-8'
        : 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename || slug}.vcf"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  }
  )
}
