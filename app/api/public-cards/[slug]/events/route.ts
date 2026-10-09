import { NextResponse } from 'next/server'
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
