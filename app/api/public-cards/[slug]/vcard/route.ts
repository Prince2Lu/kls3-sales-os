import { getDigitalCardBySlug, buildVCard } from '@/lib/digital-cards'

export const dynamic = 'force-dynamic'

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

  return new Response(buildVCard(card), {
    status: 200,
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename || slug}.vcf"`,
      'Cache-Control': 'no-store',
    },
  })
}
