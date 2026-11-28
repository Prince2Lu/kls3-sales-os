// "Mode de travail" (/work) was merged into Prospection (Trello #59).
// Old links and bookmarks keep working: prospecting statuses open Prospection,
// opportunity stages open the Pipeline.

import { redirect } from 'next/navigation'

const OPPORTUNITY_STAGES = new Set(['RDV', 'Opportunité', 'Proposition', 'Gagné', 'Perdu'])

export default async function WorkPage(props: {
  searchParams: Promise<{ bl?: string; status?: string }>
}) {
  const { bl, status } = await props.searchParams
  if (status && OPPORTUNITY_STAGES.has(status)) redirect('/pipeline')
  redirect(bl ? `/cold-call?bl=${encodeURIComponent(bl)}` : '/cold-call')
}
