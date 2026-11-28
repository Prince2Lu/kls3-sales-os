'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addSalesUserAction } from './actions'

type Created = { name: string; email: string; password: string }

export function AddUserForm({ businessLines }: { businessLines: { id: string; name: string }[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'SALES' | 'SALES_DIRECTOR'>('SALES')
  const [blIds, setBlIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<Created | null>(null)

  function toggle(id: string) {
    setBlIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await addSalesUserAction({ firstName, lastName, email, role, businessLineIds: blIds })
      if (!result.success) {
        setError(result.error)
        return
      }
      setCreated({ name: result.name, email: result.email, password: result.password })
      setFirstName(''); setLastName(''); setEmail(''); setBlIds([]); setRole('SALES')
      router.refresh()
    })
  }

  if (created) {
    return (
      <Card className="p-6 space-y-3" role="status">
        <h2 className="text-lg font-medium">{created.name} est créé</h2>
        <p className="text-sm text-text-muted">
          Transmettez-lui ces identifiants par un canal privé. Le mot de passe provisoire ne sera plus affiché.
        </p>
        <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-text-muted">Email</dt><dd>{created.email}</dd>
          <dt className="text-text-muted">Mot de passe</dt><dd className="font-mono select-all">{created.password}</dd>
        </dl>
        <p className="text-xs text-text-muted">Il pourra le changer dans Préférences dès sa première connexion.</p>
        <Button variant="ghost" onClick={() => setCreated(null)}>Ajouter un autre commercial</Button>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-lg font-medium">Ajouter un commercial</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm text-text-muted">Prénom
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="mt-1" />
          </label>
          <label className="text-sm text-text-muted">Nom
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1" />
          </label>
          <label className="text-sm text-text-muted">Email
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
          </label>
          <label className="text-sm text-text-muted">Rôle
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'SALES' | 'SALES_DIRECTOR')}
              className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-text-primary"
            >
              <option value="SALES">Commercial</option>
              <option value="SALES_DIRECTOR">Directeur commercial</option>
            </select>
          </label>
        </div>
        <fieldset>
          <legend className="text-sm text-text-muted mb-2">Business lines (aucune cochée = toutes)</legend>
          <div className="flex flex-wrap gap-2">
            {businessLines.map((bl) => (
              <label key={bl.id} className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm cursor-pointer">
                <input type="checkbox" checked={blIds.includes(bl.id)} onChange={() => toggle(bl.id)} />
                {bl.name}
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
        <Button type="submit" disabled={isPending}>{isPending ? 'Création…' : 'Créer le commercial'}</Button>
      </form>
    </Card>
  )
}
