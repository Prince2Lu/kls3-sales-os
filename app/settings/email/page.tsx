import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getMailSettings, publicMailSettings } from '@/lib/mail-settings'
import type { Owner } from '@/types/domain'
import { MailSettingsClient } from './mail-settings-client'

export const dynamic = 'force-dynamic'

export default async function MailSettingsPage() {
  const session = await auth()
  if (!session?.user?.name) redirect('/login')

  const currentOwner = session.user.name as Owner
  const isAdmin = session.user.role === 'ADMIN'
  const owners: Owner[] = isAdmin ? ['Eric', 'Lilian'] : [currentOwner]

  const settings = await Promise.all(
    owners.map(async (owner) => publicMailSettings(await getMailSettings(owner)))
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-syne">Paramètres messagerie</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Configurez les boîtes KLS3 utilisées pour les mails directs du CRM. Les mots de passe sont chiffrés avant stockage et ne sont jamais réaffichés.
        </p>
      </div>

      <MailSettingsClient settings={settings} />
    </div>
  )
}
