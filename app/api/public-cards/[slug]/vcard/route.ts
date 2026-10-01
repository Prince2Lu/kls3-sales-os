import {
  getDigitalCardBySlug,
  buildVCard,
  type EmbeddedVCardPhoto,
} from '@/lib/digital-cards'

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
  _request: Request,
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

  const photo = await loadPhoto(
    card.photoVCardUrl || card.photoUrl,
    card.photoMimeType
  )

  return new Response(buildVCard(card, photo), {
    status: 200,
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename || slug}.vcf"`,
      'Cache-Control': 'no-store',
    },
  })
}
