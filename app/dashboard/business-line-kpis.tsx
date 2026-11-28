// The 6 KPIs per business line (Trello #62): first block of the Dashboard.

import type { DateRange } from '@/lib/utils/period'
import type { BusinessLine } from '@/types/domain'
import type { GoalData } from '@/lib/goals/goal-progress'
import { buildBusinessLineKpis, type BusinessLineKpiRow } from '@/lib/dashboard/business-line-kpis'

interface BusinessLineKpisProps {
  businessLines: BusinessLine[]
  selectedBusinessLineId: string | null
  period: DateRange
  data: GoalData
  onSelectBusinessLine: (businessLineId: string) => void
}

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

function rate(row: BusinessLineKpiRow): string {
  return row.meetingRate === null ? '—' : `${Math.round(row.meetingRate * 100)} %`
}

function revenue(row: BusinessLineKpiRow): string {
  if (row.businessLine.revenueType === 'MRR') return row.newMrr > 0 ? `+${euro.format(row.newMrr)} MRR` : '—'
  return row.revenue > 0 ? euro.format(row.revenue) : '—'
}

function pipeline(row: BusinessLineKpiRow): string {
  return row.weightedPipeline > 0 ? euro.format(row.weightedPipeline) : '—'
}

const COLUMNS: { label: string; hint: string; value: (row: BusinessLineKpiRow) => string }[] = [
  { label: 'Appels', hint: 'Activité', value: (row) => String(row.calls) },
  { label: 'Conversations', hint: 'Activité', value: (row) => String(row.conversations) },
  { label: 'RDV pris', hint: 'Conversion', value: (row) => String(row.meetings) },
  { label: 'RDV / appel', hint: 'Conversion', value: rate },
  { label: 'Pipeline pondéré', hint: 'Valeur × probabilité, en cours', value: pipeline },
  { label: 'Revenu réalisé', hint: 'Value Events confirmés ou payés', value: revenue },
]

export function BusinessLineKpis({ businessLines, selectedBusinessLineId, period, data, onSelectBusinessLine }: BusinessLineKpisProps) {
  const rows = buildBusinessLineKpis({ businessLines, period, data }).filter(
    (row) => !selectedBusinessLineId || row.businessLine.id === selectedBusinessLineId
  )
  const missingProbability = rows.reduce((sum, row) => sum + row.openWithoutProbability, 0)

  if (rows.length === 0) {
    return <p className="text-sm text-text-muted">Aucune business line active.</p>
  }

  return (
    <div className="space-y-3">
      {/* Mobile: one card per business line */}
      <div className="grid gap-1 rounded-[20px] overflow-hidden bg-[rgba(255,255,255,0.06)] p-1 md:hidden">
        {rows.map((row) => (
          <button
            key={row.businessLine.id}
            type="button"
            onClick={() => onSelectBusinessLine(row.businessLine.id)}
            className="rounded-2xl bg-card-bg p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <div className="font-syne font-semibold mb-3">{row.businessLine.name}</div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {COLUMNS.map((column) => (
                <div key={column.label} className="flex justify-between gap-2">
                  <dt className="text-text-muted">{column.label}</dt>
                  <dd className="font-medium">{column.value(row)}</dd>
                </div>
              ))}
            </dl>
          </button>
        ))}
      </div>

      {/* Tablet and desktop: comparison table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border-[0.5px] border-border bg-card-bg">
        <table className="w-full text-sm">
          <caption className="sr-only">Six indicateurs par business line sur la période</caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="px-4 py-3 font-medium text-text-muted">Business line</th>
              {COLUMNS.map((column) => (
                <th key={column.label} scope="col" title={column.hint} className="px-4 py-3 font-medium text-text-muted text-right whitespace-nowrap">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.businessLine.id} className="border-b border-border last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => onSelectBusinessLine(row.businessLine.id)}
                    className="hover:text-accent focus:outline-none focus-visible:underline"
                  >
                    {row.businessLine.name}
                  </button>
                </th>
                {COLUMNS.map((column) => (
                  <td key={column.label} className="px-4 py-3 text-right tabular-nums">
                    {column.value(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {missingProbability > 0 && (
        <p className="text-xs text-text-muted">
          {missingProbability} opportunité{missingProbability > 1 ? 's' : ''} en cours sans probabilité : non comptée{missingProbability > 1 ? 's' : ''} dans le pipeline pondéré.
        </p>
      )}
    </div>
  )
}
