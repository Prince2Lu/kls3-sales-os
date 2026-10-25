import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getUserByEmail } from '@/lib/airtable'
import { PreferencesForm } from './preferences-form'

export default async function PreferencesPage() {
  const session = await auth()
  const email = session?.user?.email
  if (!email) redirect('/login')

  const user = await getUserByEmail(email)
  if (!user) redirect('/login')

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold font-syne">Préférences</h1>
        <p className="text-text-muted mt-2">
          Gérez votre profil, l’apparence de Sales OS et votre mot de passe.
        </p>
      </div>

      <PreferencesForm
        email={user.email}
        firstName={user.firstName || user.name}
        lastName={user.lastName || ''}
        theme={user.theme}
      />
    </div>
  )
}
