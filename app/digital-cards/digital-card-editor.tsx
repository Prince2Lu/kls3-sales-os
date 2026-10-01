'use client'

import { useState } from 'react'
import type { DigitalCard, DigitalCardProject } from '@/lib/digital-cards'

const PUBLIC_BASE_URL = 'https://www.kls3-dev.com/carte'
const QR_BASE_URL = 'https://api.qrserver.com/v1/create-qr-code/'

function projectsToText(projects: DigitalCardProject[]) {
  return projects.map((p) => `${p.label}|${p.url}`).join('\n')
}

function textToProjects(value: string): DigitalCardProject[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split('|')
      return { label: label.trim(), url: rest.join('|').trim() }
    })
    .filter((p) => p.label && p.url)
}

export function DigitalCardEditor({ initialCard }: { initialCard: DigitalCard }) {
  const [card, setCard] = useState(initialCard)
  const [projectsText, setProjectsText] = useState(projectsToText(initialCard.projects))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'photo' | 'logo' | null>(null)
  const [message, setMessage] = useState('')

  const publicUrl = `${PUBLIC_BASE_URL}/${card.slug}`
  const qrUrl = `${QR_BASE_URL}?size=360x360&format=svg&data=${encodeURIComponent(publicUrl)}`

  async function save() {
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch(`/api/digital-cards/${card.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...card,
          projects: textToProjects(projectsText),
        }),
      })
      if (!response.ok) throw new Error('Erreur de sauvegarde')
      const updated = await response.json()
      setCard(updated)
      setProjectsText(projectsToText(updated.projects))
      setMessage('Enregistré')
    } catch {
      setMessage('Échec de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  async function uploadMedia(kind: 'photo' | 'logo', file: File | null) {
    if (!file) return
    setUploading(kind)
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('kind', kind)
      formData.append('file', file)

      const response = await fetch(`/api/digital-cards/${card.slug}/media`, {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Erreur de téléversement')
      }

      setCard(payload)
      setProjectsText(projectsToText(payload.projects))
      setMessage(kind === 'photo' ? 'Photo mise à jour' : 'Logo mis à jour')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Échec du téléversement')
    } finally {
      setUploading(null)
    }
  }

  const field = (label: string, key: keyof DigitalCard, type = 'text') => (
    <label className="space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={String(card[key] ?? '')}
        onChange={(e) => setCard({ ...card, [key]: e.target.value })}
        className="w-full rounded-lg border border-border bg-background px-3 py-2"
      />
    </label>
  )

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {field('Prénom', 'firstName')}
          {field('Nom', 'lastName')}
          {field('Nom affiché', 'displayName')}
          {field('Fonction', 'title')}
          {field('Société', 'company')}
          {field('Email', 'email', 'email')}
          {field('Téléphone', 'phone', 'tel')}
          {field('LinkedIn', 'linkedin', 'url')}
          {field('Site web', 'website', 'url')}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 rounded-lg border border-border p-4">
            <span className="block text-sm font-medium">Photo de profil</span>
            {card.photoUrl && (
              <img
                src={card.photoUrl}
                alt={card.displayName}
                className="h-24 w-24 rounded-xl object-cover"
              />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading !== null}
              onChange={(e) => void uploadMedia('photo', e.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
            <span className="block text-xs text-muted-foreground">JPG, PNG ou WebP · 5 Mo maximum</span>
            {uploading === 'photo' && <span className="block text-xs text-muted-foreground">Téléversement…</span>}
          </label>

          <label className="space-y-2 rounded-lg border border-border p-4">
            <span className="block text-sm font-medium">Logo</span>
            {card.logoUrl && (
              <img
                src={card.logoUrl}
                alt="Logo"
                className="h-20 w-20 rounded-lg bg-white object-contain p-2"
              />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading !== null}
              onChange={(e) => void uploadMedia('logo', e.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
            <span className="block text-xs text-muted-foreground">JPG, PNG ou WebP · 5 Mo maximum</span>
            {uploading === 'logo' && <span className="block text-xs text-muted-foreground">Téléversement…</span>}
          </label>
        </div>

        <label className="space-y-1 block">
          <span className="text-sm font-medium">Bio courte</span>
          <textarea
            rows={3}
            value={card.bio}
            onChange={(e) => setCard({ ...card, bio: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        </label>

        <label className="space-y-1 block">
          <span className="text-sm font-medium">Projets / liens</span>
          <span className="block text-xs text-muted-foreground">Un par ligne : Nom|https://...</span>
          <textarea
            rows={4}
            value={projectsText}
            onChange={(e) => setProjectsText(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={card.active}
            onChange={(e) => setCard({ ...card, active: e.target.checked })}
          />
          <span>Carte publique active</span>
        </label>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {message && <span className="text-sm text-muted-foreground">{message}</span>}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <div className="text-lg font-semibold">{card.displayName || card.firstName}</div>
          <div className="text-sm text-muted-foreground">{card.title || card.company}</div>
          <img
            src={qrUrl}
            alt={`QR code de ${card.displayName}`}
            className="mx-auto my-4 h-56 w-56 rounded-lg bg-white p-2"
          />
          <a href={publicUrl} target="_blank" rel="noreferrer" className="text-sm text-accent underline">
            Ouvrir la carte publique
          </a>
          <div className="mt-3 break-all text-xs text-muted-foreground">{publicUrl}</div>
        </div>
      </aside>
    </section>
  )
}
