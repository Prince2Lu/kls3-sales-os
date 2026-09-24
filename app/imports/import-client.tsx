'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Database, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ImportBatch } from '@/types/domain'
import type { NotaryDirectoryCandidate } from '@/lib/notaries/directory'
import { importNotaryPilotAction, previewNotaryImportAction } from './actions'

export function ImportClient({ lastImport, importEnabled }: { lastImport: ImportBatch | null; importEnabled: boolean }) {
  const [candidates, setCandidates] = useState<NotaryDirectoryCandidate[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const preview = () => startTransition(async () => {
    setMessage(null)
    const result = await previewNotaryImportAction()
    if (!result.success) return setMessage(result.error ?? 'Prévisualisation impossible')
    setCandidates(result.candidates ?? [])
  })

  const runImport = () => startTransition(async () => {
    if (!window.confirm(`Importer ${candidates.length} offices et leurs notaires ? Aucune opportunité ni cible Cold Call ne sera créée.`)) return
    const result = await importNotaryPilotAction(candidates)
    if (!result.success) return setMessage(result.error ?? "L'import a échoué")
    setMessage(`Import terminé : ${result.stats?.companiesCreated ?? 0} entreprise(s), ${result.stats?.contactsCreated ?? 0} contact(s).`)
    setCandidates([])
  })

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <Database className="mb-3 h-5 w-5 text-accent" />
          <p className="font-semibold">Source</p>
          <p className="mt-1 text-sm text-muted-foreground">Annuaires officiels — Grand Est</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <CheckCircle2 className="mb-3 h-5 w-5 text-accent" />
          <p className="font-semibold">Filtre pilote</p>
          <p className="mt-1 text-sm text-muted-foreground">Offices principaux · 3 à 10 notaires · maximum 25</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <ShieldCheck className="mb-3 h-5 w-5 text-accent" />
          <p className="font-semibold">Garde-fous</p>
          <p className="mt-1 text-sm text-muted-foreground">Doublons contrôlés · exclusions conservées · aucun envoi</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Nouveau lot</h2>
            <p className="text-sm text-muted-foreground">La prévisualisation ne modifie aucune donnée.</p>
          </div>
          <Button onClick={preview} disabled={isPending || !importEnabled}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Prévisualiser 25 offices
          </Button>
        </div>

        {!importEnabled && (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            Import verrouillé tant que la réutilisation commerciale de la source n’est pas autorisée.
          </p>
        )}

        {message && <p className="mt-4 rounded-lg bg-muted p-3 text-sm">{message}</p>}

        {candidates.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">{candidates.length} offices prêts à importer · {candidates.reduce((count, item) => count + item.notaries.filter((notary) => notary.email).length, 0)} emails nominatifs trouvés</p>
              <Button onClick={runImport} disabled={isPending}>Importer ce lot</Button>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="max-h-[480px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted"><tr><th className="p-3">Office</th><th className="p-3">Ville</th><th className="p-3">Notaires</th><th className="p-3">Destinataire futur</th></tr></thead>
                  <tbody>{candidates.map((item) => (
                    <tr key={item.sourceId} className="border-t border-border">
                      <td className="p-3 font-medium">{item.name}</td><td className="p-3">{item.postalCode} {item.city}</td>
                      <td className="p-3">{item.notaries.length}</td><td className="p-3">{item.email || 'Email manquant'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">L’import met aussi à jour les emails directs manquants des contacts déjà présents. L’email de l’étude reste disponible si aucun email nominatif n’est trouvé. Aucune opportunité, cible Cold Call, tâche ou campagne Brevo n’est créée.</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">Dernier import</h2>
        {!lastImport ? <p className="mt-2 text-sm text-muted-foreground">Aucun import réalisé.</p> : (
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <div><span className="text-muted-foreground">Date</span><p className="font-medium">{new Date(lastImport.importedAt ?? lastImport.createdAt).toLocaleString('fr-FR')}</p></div>
            <div><span className="text-muted-foreground">Statut</span><p className="font-medium">{lastImport.status}</p></div>
            <div><span className="text-muted-foreground">Créées</span><p className="font-medium">{lastImport.companiesCreated}</p></div>
            <div><span className="text-muted-foreground">Mises à jour</span><p className="font-medium">{lastImport.companiesUpdated}</p></div>
            <div><span className="text-muted-foreground">Contacts</span><p className="font-medium">{lastImport.contactsCreated}</p></div>
            <div><span className="text-muted-foreground">Doublons</span><p className="font-medium">{lastImport.duplicatesSkipped}</p></div>
          </div>
        )}
      </div>
    </div>
  )
}
