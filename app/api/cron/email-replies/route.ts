// Daily check of replies to Sales OS direct emails (Trello #65).
// Called by Vercel Cron with `Authorization: Bearer $CRON_SECRET`; refused without it.

import { timingSafeEqual } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { syncDirectEmailReplies } from '@/lib/email-replies/sync'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const received = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  const result = await syncDirectEmailReplies()
  if (result.logged > 0) {
    revalidatePath('/today')
    revalidatePath('/cold-call')
  }
  logger.info('direct email replies synced', {
    logged: result.logged,
    owners: result.owners.map((owner) => ({ checked: owner.checked, found: owner.found, logged: owner.logged, failed: !!owner.error })),
  })

  return NextResponse.json(
    { logged: result.logged, owners: result.owners.map(({ owner, checked, found, logged, error }) => ({ owner, checked, found, logged, failed: !!error })) },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
