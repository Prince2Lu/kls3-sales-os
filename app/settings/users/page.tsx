import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getBusinessLines, getUsers } from '@/lib/airtable'
import { Card } from '@/components/ui/card'
import { AddUserForm } from './add-user-form'

export const dynamic = 'force-dynamic'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  SALES_DIRECTOR: 'Directeur commercial',
  SALES: 'Commercial',
}

export default async function UsersPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'ADMIN') {
    return <p className="text-text-muted">Cette page est réservée au rôle ADMIN.</p>
  }

  const [users, businessLines] = await Promise.all([getUsers(), getBusinessLines()])
  const blName = new Map(businessLines.map((bl) => [bl.id, bl.name]))
  const sorted = [...users].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'fr'))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold font-syne">Utilisateurs</h1>
        <p className="mt-2 max-w-3xl text-text-muted">
          Ajoutez un commercial : sa fiche USERS est créée avec un mot de passe provisoire, qu&apos;il change ensuite dans Préférences.
        </p>
      </div>

      <AddUserForm businessLines={businessLines.filter((bl) => bl.active !== false).map((bl) => ({ id: bl.id, name: bl.name }))} />

      <Card className="p-0 overflow-hidden">
        <ul className="divide-y divide-border">
          {sorted.map((user) => (
            <li key={user.id} className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${user.active ? '' : 'opacity-50'}`}>
              <div className="min-w-0">
                <div className="font-medium">{user.name}{!user.active && ' (inactif)'}</div>
                <div className="text-xs text-text-muted truncate">{user.email}</div>
              </div>
              <div className="text-right text-xs text-text-muted">
                <div>{ROLE_LABELS[user.role] ?? user.role}</div>
                <div>
                  {user.businessLineIds.length
                    ? user.businessLineIds.map((id) => blName.get(id) ?? '?').join(', ')
                    : 'Toutes les business lines'}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
