import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getDigitalCardBySlug, updateDigitalCard } from '@/lib/digital-cards'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  const card = await getDigitalCardBySlug(slug, { includeInactive: true })
  if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(card)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  const body = await request.json()

  const allowed = {
    firstName: body.firstName,
    lastName: body.lastName,
    displayName: body.displayName,
    title: body.title,
    company: body.company,
    email: body.email,
    phone: body.phone,
    linkedin: body.linkedin,
    website: body.website,
    photoUrl: body.photoUrl,
    bio: body.bio,
    projects: Array.isArray(body.projects) ? body.projects : undefined,
    active: typeof body.active === 'boolean' ? body.active : undefined,
  }

  try {
    const updated = await updateDigitalCard(slug, allowed)
    return NextResponse.json(updated)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
