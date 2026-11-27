import { NextResponse } from 'next/server'
import { allowRequest, clientIp } from '@/lib/auth/rate-limit'
import {
  CARD_EVENT_TYPES,
  recordCardEvent,
  type CardEventType,
} from '@/lib/card-analytics'

export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.kls3-dev.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    // Public endpoint: at most 60 events per minute per visitor IP and card
    if (!allowRequest(`card-events:${clientIp(request)}:${slug}`, 60, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: corsHeaders })
    }
    const body = (await request.json()) as {
      eventType?: string
      visitorId?: string
      source?: string
      campaign?: string
      projectLabel?: string
      pageReferrer?: string
      cardRef?: string
    }

    if (!body.eventType || !CARD_EVENT_TYPES.includes(body.eventType as CardEventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400, headers: corsHeaders })
    }

    await recordCardEvent({
      cardSlug: slug,
      eventType: body.eventType as CardEventType,
      visitorId: body.visitorId,
      source: body.source,
      campaign: body.campaign,
      projectLabel: body.projectLabel,
      pageReferrer: body.pageReferrer,
      cardRef: body.cardRef,
    })

    return NextResponse.json({ ok: true }, { status: 201, headers: corsHeaders })
  } catch {
    return NextResponse.json({ error: 'Unable to record event' }, { status: 500, headers: corsHeaders })
  }
}
