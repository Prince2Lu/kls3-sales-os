import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { uploadDigitalCardMedia } from '@/lib/digital-cards'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  const formData = await request.formData()
  const file = formData.get('file')
  const kind = formData.get('kind')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  if (kind !== 'photo' && kind !== 'logo') {
    return NextResponse.json({ error: 'Invalid media kind' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Format non supporté. Utilisez JPG, PNG ou WebP.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'Image trop volumineuse. Maximum 5 Mo.' },
      { status: 400 }
    )
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const updated = await uploadDigitalCardMedia(slug, kind, {
      name: file.name,
      type: file.type,
      bytes,
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
