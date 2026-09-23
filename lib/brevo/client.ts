const API_URL = 'https://api.brevo.com/v3'

function getApiKey(): string {
  const value = process.env.BREVO_API_KEY
  if (!value) throw new Error("BREVO_API_KEY n'est pas configurée")
  return value
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'api-key': getApiKey(),
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Brevo ${response.status}: ${await response.text()}`)
  if (response.status === 204) return {} as T
  return response.json() as Promise<T>
}

export interface BrevoTemplate {
  id: number
  name: string
  subject: string
  isActive: boolean
  modifiedAt: string | null
  senderName: string | null
  senderEmail: string | null
  replyTo: string | null
}

interface BrevoTemplateApi {
  id: number
  name: string
  subject: string
  isActive: boolean
  modifiedAt?: string
  replyTo?: string
  sender?: { name?: string; email?: string }
}

export interface BrevoTemplatePreview {
  html: string
  subject: string
  fromName: string | null
  fromEmail: string | null
  previewText: string | null
}

function mapTemplate(template: BrevoTemplateApi): BrevoTemplate {
  return {
    id: template.id,
    name: template.name,
    subject: template.subject,
    isActive: template.isActive,
    modifiedAt: template.modifiedAt ?? null,
    senderName: template.sender?.name ?? null,
    senderEmail: template.sender?.email ?? null,
    replyTo: template.replyTo ?? null,
  }
}

export async function getBrevoTemplates(): Promise<BrevoTemplate[]> {
  const result = await request<{ templates?: BrevoTemplateApi[] }>(
    '/smtp/templates?templateStatus=true&limit=1000&sort=desc',
    { method: 'GET' }
  )
  return (result.templates ?? []).filter((template) => template.isActive).map(mapTemplate)
}

export async function getBrevoTemplate(templateId: number): Promise<BrevoTemplate> {
  const result = await request<BrevoTemplateApi>(`/smtp/templates/${templateId}`, { method: 'GET' })
  return mapTemplate(result)
}

export async function previewBrevoTemplate(input: {
  templateId: number
  params: Record<string, string>
}): Promise<BrevoTemplatePreview> {
  const result = await request<{
    html?: string
    subject?: string
    fromName?: string
    fromEmail?: string
    previewText?: string
  }>('/smtp/template/preview', {
    method: 'POST',
    body: JSON.stringify({ templateId: input.templateId, params: input.params }),
  })
  return {
    html: result.html ?? '',
    subject: result.subject ?? '',
    fromName: result.fromName ?? null,
    fromEmail: result.fromEmail ?? null,
    previewText: result.previewText ?? null,
  }
}

export async function sendBrevoTemplateTest(templateId: number, email: string): Promise<void> {
  await request(`/smtp/templates/${templateId}/sendTest`, {
    method: 'POST',
    body: JSON.stringify({ emailTo: [email] }),
  })
}

export async function createBrevoList(name: string): Promise<number> {
  const folderId = Number(process.env.BREVO_FOLDER_ID)
  if (!Number.isFinite(folderId)) throw new Error("BREVO_FOLDER_ID n'est pas configuré")
  const result = await request<{ id: number }>('/contacts/lists', { method: 'POST', body: JSON.stringify({ name, folderId }) })
  return result.id
}

export async function upsertBrevoContact(input: { email: string; listId: number; companyName: string; firstName?: string; lastName?: string }): Promise<void> {
  await request('/contacts', { method: 'POST', body: JSON.stringify({
    email: input.email, updateEnabled: true, listIds: [input.listId],
    attributes: { COMPANY: input.companyName, PRENOM: input.firstName ?? '', NOM: input.lastName ?? '' },
  }) })
}

export async function createBrevoCampaign(input: {
  name: string; subject: string; senderName: string; senderEmail: string; replyTo?: string | null; templateId: number; listId: number
}): Promise<number> {
  const result = await request<{ id: number }>('/emailCampaigns', { method: 'POST', body: JSON.stringify({
    name: input.name, subject: input.subject, sender: { name: input.senderName, email: input.senderEmail },
    replyTo: input.replyTo || input.senderEmail, type: 'classic', templateId: input.templateId, recipients: { listIds: [input.listId] },
  }) })
  return result.id
}

export async function sendBrevoCampaignNow(campaignId: number): Promise<void> {
  await request(`/emailCampaigns/${campaignId}/sendNow`, { method: 'POST' })
}
