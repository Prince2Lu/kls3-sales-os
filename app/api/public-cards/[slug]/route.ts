import { NextResponse } from 'next/server'
import { getDigitalCardBySlug } from '@/lib/digital-cards'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const card = await getDigitalCardBySlug(slug)

  if (!card) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { id: _id, ...publicCard } = card

  return NextResponse.json(publicCard, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
