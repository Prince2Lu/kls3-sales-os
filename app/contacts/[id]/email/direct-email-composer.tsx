'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { Bold, Italic, Link2, List, ListOrdered, Paperclip, Underline, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sendDirectEmailAction } from './actions'

const MAX_FILES = 5
const MAX_FILE_SIZE = 2 * 1024 * 1024
const MAX_TOTAL_SIZE = 3 * 1024 * 1024

function formatBytes(value: number) {
  if (value < 1024) return `${value} o`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} Ko`
  return `${(value / (1024 * 1024)).toFixed(1)} Mo`
}

export function DirectEmailComposer({
  contactId,
  contactName,
  email,
  configured,
}: {
  contactId: string
  contactName: string
  email: string
  configured: boolean
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [subject, setSubject] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()

  const apply = (command: string, value?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
  }

  const addLink = () => {
    const selection = window.getSelection()?.toString().trim()
    if (!selection) {
      setMessage('Sélectionnez d’abord le texte qui doit devenir cliquable.')
      return
    }

    const url = window.prompt('URL du lien :', 'https://')
    if (!url) return

    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
      apply('createLink', parsed.toString())
    } catch {
      setMessage('Adresse du lien invalide.')
    }
  }

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    const next = [...files, ...Array.from(incoming)]
    if (next.length > MAX_FILES) {
      setMessage(`Maximum ${MAX_FILES} pièces jointes.`)
      return
    }

    const oversized = next.find((file) => file.size > MAX_FILE_SIZE)
    if (oversized) {
      setMessage(`${oversized.name} dépasse 2 Mo.`)
      return
    }

    const total = next.reduce((sum, file) => sum + file.size, 0)
    if (total > MAX_TOTAL_SIZE) {
      setMessage('Le total des pièces jointes ne peut pas dépasser 3 Mo.')
      return
    }

    setFiles(next)
    setMessage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const send = () => {
    const editor = editorRef.current
    if (!editor) return

    const bodyHtml = editor.innerHTML.trim()
    const bodyText = editor.innerText.trim()

    if (!subject.trim() || !bodyText) {
      setMessage('Renseignez l’objet et le message.')
      return
    }

    if (!window.confirm(`Envoyer maintenant ce mail à ${email} ?`)) return

    startTransition(async () => {
      setMessage(null)
      setWarning(null)

      const formData = new FormData()
      formData.set('contactId', contactId)
      formData.set('subject', subject)
      formData.set('bodyHtml', bodyHtml)
      formData.set('bodyText', bodyText)
      files.forEach((file) => formData.append('attachments', file, file.name))

      const result = await sendDirectEmailAction(formData)

      if (!result.success) {
        setSuccess(false)
        setMessage(result.error || 'Échec de l’envoi.')
        return
      }

      setSuccess(true)
      setMessage('Mail envoyé et enregistré dans le CRM.')
      setWarning(result.warning || null)
    })
  }

  return (
    <div className="space-y-6">
      {!configured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          L’éditeur est prêt, mais la boîte KLS3 doit encore être reliée en SMTP/IMAP avant le premier envoi.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="grid gap-5">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Destinataire</div>
            <div className="font-medium">{contactName}</div>
            <div className="text-sm text-muted-foreground">{email}</div>
          </div>

          <div>
            <label htmlFor="subject" className="mb-2 block text-sm font-medium">Objet</label>
            <Input
              id="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Objet du mail"
              disabled={pending || success}
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">Message</div>
            <div className="overflow-hidden rounded-xl border border-input bg-background">
              <div className="flex flex-wrap gap-1 border-b border-border bg-muted/40 p-2">
                <button type="button" onClick={() => apply('bold')} aria-label="Gras" className="rounded p-2 hover:bg-white/10">
                  <Bold className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => apply('italic')} aria-label="Italique" className="rounded p-2 hover:bg-white/10">
                  <Italic className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => apply('underline')} aria-label="Souligné" className="rounded p-2 hover:bg-white/10">
                  <Underline className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => apply('insertUnorderedList')} aria-label="Liste" className="rounded p-2 hover:bg-white/10">
                  <List className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => apply('insertOrderedList')} aria-label="Liste numérotée" className="rounded p-2 hover:bg-white/10">
                  <ListOrdered className="h-4 w-4" />
                </button>
                <button type="button" onClick={addLink} aria-label="Ajouter un lien" className="rounded p-2 hover:bg-white/10">
                  <Link2 className="h-4 w-4" />
                </button>
              </div>

              <div
                ref={editorRef}
                contentEditable={!pending && !success}
                suppressContentEditableWarning
                className="min-h-[280px] px-4 py-4 text-sm leading-6 outline-none [&_a]:text-accent [&_a]:underline"
                data-placeholder="Rédigez votre message…"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Sélectionnez du texte puis utilisez l’icône lien pour créer un hyperlien.
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Pièces jointes</div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={pending || success}
                className="inline-flex items-center gap-2 text-sm text-accent hover:underline disabled:opacity-50"
              >
                <Paperclip className="h-4 w-4" />
                Ajouter
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp"
              onChange={(event) => addFiles(event.target.files)}
            />

            {files.length ? (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate">{file.name}</div>
                      <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
                    </div>
                    <button type="button" onClick={() => removeFile(index)} disabled={pending || success} aria-label={`Retirer ${file.name}`} className="rounded p-1 hover:bg-white/10">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Aucune pièce jointe. Maximum 5 fichiers, 2 Mo par fichier et 3 Mo au total.
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <div className="font-medium">Signature ajoutée automatiquement</div>
            <div className="mt-2 text-muted-foreground">
              Votre nom<br />
              Votre fonction - KLS3<br />
              <span className="text-accent">Ma carte de contact digitale →</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              La dernière ligne sera un véritable hyperlien vers la carte personnalisée du destinataire.
            </p>
          </div>

          {message && (
            <div className={`rounded-lg border p-3 text-sm ${success ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-destructive/30 bg-destructive/10'}`}>
              {message}
            </div>
          )}

          {warning && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              {warning}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {!success ? (
              <Button onClick={send} disabled={pending || !configured || !subject.trim()}>
                {pending ? 'Envoi…' : 'Envoyer le mail'}
              </Button>
            ) : (
              <Link href={`/contacts/${contactId}`}>
                <Button>Retour au contact</Button>
              </Link>
            )}
            {!success && (
              <Link href={`/contacts/${contactId}`}>
                <Button variant="ghost">Annuler</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
