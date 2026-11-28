'use client'

// Import CSV « Sales OS friendly » (Trello #58): file → preview → import → rollback.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, FileUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BusinessLine } from '@/types/domain'
import type { ImportPlan, PlannedRow } from '@/lib/imports/sales-os-import'
import { TEMPLATE_HEADERS } from '@/lib/imports/sales-os-import'
import { importCsvAction, previewCsvImportAction } from './actions'

const STATE_LABEL: Record<string, string> = {
  CREATE: 'Nouveau',
  EXISTING: 'Déjà présent',
  IN_FILE: 'Doublon du fichier',
  NONE: '—',
}

function downloadTemplate() {
  const csv = `﻿${TEMPLATE_HEADERS.join(';')}\n`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'modele-import-sales-os.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function rowLabel(state: string, matchedBy: string | null) {
  return matchedBy && state !== 'CREATE' ? `${STATE_LABEL[state]} (${matchedBy})` : STATE_LABEL[state]
}

export function CsvImportClient({ businessLines }: { businessLines: BusinessLine[] }) {
  const router = useRouter()
  const [csv, setCsv] = useState('')
  const [fileName, setFileName] = useState('')
  const [businessLineId, setBusinessLineId] = useState('')
  const [createTargets, setCreateTargets] = useState(true)
  const [defaultIndustry, setDefaultIndustry] = useState('')
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const input = { csv, fileName, businessLineId, createTargets, defaultIndustry }

  async function onFile(file: File | undefined) {
    setPlan(null)
    setMessage(null)
    if (!file) return
    setFileName(file.name)
    setCsv(await file.text())
  }

  const preview = () => startTransition(async () => {
    setMessage(null)
    const result = await previewCsvImportAction(input)
    if (!result.success) { setPlan(null); setMessage(result.error); return }
    setPlan(result.plan)
  })

  const runImport = () => startTransition(async () => {
    if (!plan) return
    const valid = plan.summary.rows - plan.summary.rejected
    const ok = window.confirm(
      `Importer ${valid} ligne(s) ?\n\n` +
      `${plan.summary.companiesToCreate} entreprise(s) et ${plan.summary.contactsToCreate} contact(s) seront créés` +
      (createTargets ? `, ainsi que ${plan.summary.targetsToCreate} cible(s) de prospection` : '') +
      `.\nLes fiches existantes ne sont pas modifiées. Aucune Opportunity n'est créée.`
    )
    if (!ok) return
    const result = await importCsvAction(input)
    if (!('stats' in result) || !result.stats) { setMessage(result.error ?? "L'import a échoué."); return }
    const { companiesCreated, contactsCreated, targetsCreated, duplicatesSkipped } = result.stats
    setMessage(`Import terminé : ${companiesCreated} entreprise(s), ${contactsCreated} contact(s), ${targetsCreated} cible(s) créés, ${duplicatesSkipped} doublon(s) rapprochés.` +
      (result.error ? ` ${result.error}` : ' Le lot peut être annulé ci-dessous tant que rien n’a été travaillé.'))
    setPlan(null)
    router.refresh()
  })

  const shownRows: PlannedRow[] = plan?.rows.slice(0, 200) ?? []

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Import CSV « Sales OS friendly »</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aperçu avant écriture · doublons détectés (SIREN, domaine, email, téléphone) · lot annulable. Aucune Opportunity n’est créée.
          </p>
        </div>
        <Button variant="ghost" onClick={downloadTemplate}>
          <Download className="mr-2 h-4 w-4" /> Modèle CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Fichier CSV</span>
          <input type="file" accept=".csv,text/csv" onChange={(event) => onFile(event.target.files?.[0])}
            className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:text-white" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Business Line du lot (obligatoire)</span>
          <select value={businessLineId} onChange={(event) => { setBusinessLineId(event.target.value); setPlan(null) }}
            className="w-full rounded-lg border border-border bg-card px-3 py-2">
            <option value="">Choisir…</option>
            {businessLines.map((line) => <option key={line.id} value={line.id}>{line.name}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Secteur si la colonne est vide (facultatif)</span>
          <input value={defaultIndustry} onChange={(event) => { setDefaultIndustry(event.target.value); setPlan(null) }}
            placeholder="ex. Fonds d'Investissement" className="w-full rounded-lg border border-border bg-card px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 text-sm md:pt-6">
          <input type="checkbox" checked={createTargets} onChange={(event) => { setCreateTargets(event.target.checked); setPlan(null) }} />
          Ajouter les contacts à la Prospection (statut « À appeler »)
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={preview} disabled={isPending || !csv || !businessLineId}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
          Prévisualiser
        </Button>
        {plan && plan.summary.rows > plan.summary.rejected && (
          <Button onClick={runImport} disabled={isPending}>Importer {plan.summary.rows - plan.summary.rejected} ligne(s)</Button>
        )}
      </div>

      {message && <p className="rounded-lg bg-muted p-3 text-sm" role="status">{message}</p>}

      {plan && (
        <div className="space-y-3">
          <div className="grid gap-3 text-sm grid-cols-2 sm:grid-cols-4">
            <div><span className="text-muted-foreground">Entreprises</span><p className="font-medium">{plan.summary.companiesToCreate} nouvelles · {plan.summary.companiesExisting} existantes</p></div>
            <div><span className="text-muted-foreground">Contacts</span><p className="font-medium">{plan.summary.contactsToCreate} nouveaux · {plan.summary.contactsExisting} existants</p></div>
            <div><span className="text-muted-foreground">Prospection</span><p className="font-medium">{plan.summary.targetsToCreate} cibles · {plan.summary.targetsExisting} déjà présentes</p></div>
            <div><span className="text-muted-foreground">Lignes rejetées</span><p className="font-medium">{plan.summary.rejected} / {plan.summary.rows}</p></div>
          </div>
          {plan.unknownColumns.length > 0 && (
            <p className="text-xs text-muted-foreground">Colonnes ignorées : {plan.unknownColumns.join(', ')}</p>
          )}
          <div className="overflow-x-auto rounded-lg border border-border">
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="sticky top-0 bg-muted"><tr>
                  <th className="p-2">Ligne</th><th className="p-2">Entreprise</th><th className="p-2">Contact</th><th className="p-2">Prospection</th><th className="p-2">Remarques</th>
                </tr></thead>
                <tbody>{shownRows.map((row) => (
                  <tr key={row.line} className="border-t border-border align-top">
                    <td className="p-2 text-muted-foreground">{row.line}</td>
                    <td className="p-2"><p className="font-medium">{row.data.companyName || '—'}</p><p className="text-xs text-muted-foreground">{rowLabel(row.company.state, row.company.matchedBy)}</p></td>
                    <td className="p-2"><p>{[row.data.firstName, row.data.lastName].filter(Boolean).join(' ') || row.data.email || '—'}</p><p className="text-xs text-muted-foreground">{rowLabel(row.contact.state, row.contact.matchedBy)}</p></td>
                    <td className="p-2 text-xs">{row.target === 'CREATE' ? 'À appeler' : row.target === 'EXISTING' ? 'Déjà en prospection' : '—'}</td>
                    <td className="p-2 text-xs">
                      {row.errors.map((error) => <p key={error} className="text-red-400">{error}</p>)}
                      {row.warnings.map((warning) => <p key={warning} className="text-amber-300">{warning}</p>)}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
          {plan.rows.length > shownRows.length && <p className="text-xs text-muted-foreground">Aperçu limité aux 200 premières lignes.</p>}
        </div>
      )}
    </div>
  )
}
