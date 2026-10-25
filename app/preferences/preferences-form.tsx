'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  changePasswordAction,
  updatePreferencesAction,
} from './actions'
import {
  applyThemePreference,
  type ThemePreference,
} from '@/components/theme/theme-controller'

export function PreferencesForm({
  email,
  firstName,
  lastName,
  theme,
}: {
  email: string
  firstName: string
  lastName: string
  theme: ThemePreference
}) {
  const router = useRouter()
  const [isSavingProfile, startProfileTransition] = useTransition()
  const [isSavingPassword, startPasswordTransition] = useTransition()
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [selectedTheme, setSelectedTheme] = useState<ThemePreference>(theme)

  function handleThemeChange(value: ThemePreference) {
    setSelectedTheme(value)
    applyThemePreference(value)
  }

  async function handleProfileSubmit(formData: FormData) {
    setProfileMessage(null)
    startProfileTransition(async () => {
      const result = await updatePreferencesAction({
        firstName: String(formData.get('firstName') || ''),
        lastName: String(formData.get('lastName') || ''),
        theme: selectedTheme,
      })

      if (!result.success) {
        setProfileMessage(result.error || 'Erreur lors de l’enregistrement.')
        return
      }

      setProfileMessage('Préférences enregistrées.')
      router.refresh()
    })
  }

  async function handlePasswordSubmit(formData: FormData) {
    setPasswordMessage(null)
    startPasswordTransition(async () => {
      const result = await changePasswordAction({
        currentPassword: String(formData.get('currentPassword') || ''),
        newPassword: String(formData.get('newPassword') || ''),
        confirmPassword: String(formData.get('confirmPassword') || ''),
      })

      if (!result.success) {
        setPasswordMessage(result.error || 'Erreur lors du changement de mot de passe.')
        return
      }

      setPasswordMessage('Mot de passe modifié.')
      const form = document.getElementById('password-form') as HTMLFormElement | null
      form?.reset()
    })
  }

  return (
    <div className="space-y-6">
      <form action={handleProfileSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Prénom</label>
                <Input name="firstName" defaultValue={firstName} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Nom</label>
                <Input name="lastName" defaultValue={lastName} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input value={email} disabled />
              <p className="text-xs text-text-muted mt-1">
                L’adresse email reste l’identifiant de connexion.
              </p>
            </div>

            <div className="pt-2">
              <div className="text-sm font-semibold mb-3">Apparence</div>
              <div className="grid gap-3 sm:grid-cols-3">
                {([
                  ['dark', 'Sombre', 'Interface sombre KLS3'],
                  ['light', 'Clair', 'Fond clair et cartes lumineuses'],
                  ['system', 'Système', 'Suit le thème de votre appareil'],
                ] as const).map(([value, label, description]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleThemeChange(value)}
                    className={
                      'rounded-xl border p-4 text-left transition-colors ' +
                      (selectedTheme === value
                        ? 'border-accent bg-accent/10'
                        : 'border-border bg-card hover:border-accent/40')
                    }
                  >
                    <div className="font-medium text-sm">{label}</div>
                    <div className="text-xs text-text-muted mt-1">{description}</div>
                  </button>
                ))}
              </div>
            </div>

            {profileMessage && (
              <div className="text-sm text-text-muted">{profileMessage}</div>
            )}

            <Button type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? 'Enregistrement...' : 'Enregistrer les préférences'}
            </Button>
          </CardContent>
        </Card>
      </form>

      <form id="password-form" action={handlePasswordSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sécurité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Mot de passe actuel</label>
              <Input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Nouveau mot de passe</label>
                <Input
                  name="newPassword"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Confirmer</label>
                <Input
                  name="confirmPassword"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            {passwordMessage && (
              <div className="text-sm text-text-muted">{passwordMessage}</div>
            )}

            <Button type="submit" disabled={isSavingPassword}>
              {isSavingPassword ? 'Modification...' : 'Changer le mot de passe'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
