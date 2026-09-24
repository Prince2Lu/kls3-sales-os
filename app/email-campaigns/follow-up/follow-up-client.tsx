'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { FollowUpRow, SignalPriority } from '@/lib/brevo/follow-up-queue'
import { Button } from '@/components/ui/button'
import { planEmailFollowUpAction } from './actions'

type DisplayRow = FollowUpRow & { companyName: string; contactName: string | null }
const priorityLabels: Record<SignalPriority, string> = {
  NONE: 'Normale', LOW: 'Basse', MEDIUM: 'Moyenne', HIGH: 'Haute', URGENT: 'Très haute',
}
const statusLabels: Record<FollowUpRow['state'], string> = {
  AVAILABLE: 'À examiner', TASK_OPEN: 'Tâche ouverte', CALLED: 'Déjà appelé ou suivi dans le pipeline',
  REPLIED: 'Réponse à traiter', EXCLUDED: 'Exclu', TEST: 'Test — aucun appel créé',
}

export function FollowUpClient({ rows }: { rows: DisplayRow[] }) {
  const [selected, setSelected] = useState<string[]>([])
  const [filter, setFilter] = useState(() => rows.some((row) => row.state === 'AVAILABLE' && row.priority !== 'NONE') ? 'AVAILABLE'
    : rows.some((row) => row.state === 'TEST') ? 'TEST' : 'AVAILABLE')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const filtered = rows.filter((row) => filter === 'ALL' || (row.state === filter && (filter !== 'AVAILABLE' || row.priority !== 'NONE')))
  const actionable = (row: DisplayRow) => row.priority !== 'NONE' && (row.state === 'AVAILABLE' || row.state === 'TASK_OPEN')
  const plan = (keys: string[]) => {
    if (!keys.length) return
    startTransition(async () => {
      const result = await planEmailFollowUpAction(keys)
      setMessage(result.success ? `${result.created} tâche(s) créée(s), ${result.updated} priorité(s) mise(s) à jour.` : result.error ?? 'Erreur')
      if (result.success) { setSelected([]); router.refresh() }
    })
  }

  return <div className="rounded-xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold">Appels après campagne</h2>
        <p className="text-sm text-muted-foreground">{rows.filter((row) => row.state === 'AVAILABLE' && row.priority !== 'NONE').length} prospect(s) avec un signal à examiner. Un clic sur le CTA prime sur les ouvertures.</p>
      </div>
      <div className="flex items-center gap-2">
        <select aria-label="Filtrer les prospects" className="rounded-md border border-border bg-background p-2 text-sm" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="AVAILABLE">À examiner</option>
          <option value="TASK_OPEN">Tâche ouverte</option>
          <option value="CALLED">Déjà appelés</option>
          <option value="REPLIED">Réponses</option>
          <option value="EXCLUDED">Exclus</option>
          <option value="TEST">Tests ({rows.filter((row) => row.state === 'TEST').length})</option>
          <option value="ALL">Tous</option>
        </select>
        <Button disabled={pending || selected.length === 0} onClick={() => plan(selected)}>Planifier {selected.length || ''} appel(s)</Button>
      </div>
    </div>
    <p className="mt-3 text-xs text-muted-foreground">Sélectionnez jusqu’à 10 prospects par lot. Une tâche existante est réutilisée ; sa priorité monte si un signal plus fort arrive. Les tests sont visibles séparément, sans créer de tâche commerciale.</p>
    {message && <p role="status" className="mt-3 rounded-md bg-muted p-3 text-sm">{message}</p>}
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-border text-muted-foreground"><tr>
          <th className="p-2">Appel</th><th className="p-2">Prospect</th><th className="p-2">Priorité</th>
          <th className="p-2">Pourquoi</th><th className="p-2">Dernier signal</th><th className="p-2">Suivi</th>
        </tr></thead>
        <tbody>{filtered.map((row) => <tr key={row.key} className="border-b border-border/60">
          <td className="p-2"><input type="checkbox" aria-label={`Planifier ${row.email}`} checked={selected.includes(row.key)}
            disabled={pending || !actionable(row) || (!selected.includes(row.key) && selected.length >= 10)}
            onChange={(event) => setSelected(event.target.checked ? [...selected, row.key] : selected.filter((key) => key !== row.key))} /></td>
          <td className="p-2"><span className="font-medium">{row.companyName}</span><br />{row.contactName && <>{row.contactName} · </>}{row.email}
            <div className="text-xs text-muted-foreground">{row.campaignNames.join(' · ')}</div></td>
          <td className="p-2 font-medium">{priorityLabels[row.priority]}</td>
          <td className="p-2">{row.reason}<div className="text-xs text-muted-foreground">{row.opens} ouverture(s) · {row.totalClicks} clic(s) total · {row.clicks} sur le CTA</div></td>
          <td className="p-2">{row.lastSignalAt ? new Date(row.lastSignalAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) : '—'}</td>
          <td className="p-2">{statusLabels[row.state]}</td>
        </tr>)}</tbody>
      </table>
      {filtered.length === 0 && <p className="p-4 text-sm text-muted-foreground">Aucun prospect dans cette vue.</p>}
    </div>
  </div>
}
