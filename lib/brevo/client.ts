const API_URL = 'https://api.brevo.com/v3'

function getApiKey(): string {
  const value = process.env.BREVO_API_KEY
  if (!value) throw new Error("BREVO_API_KEY n'est pas configurée")
  return value
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'api-key': getApiKey(), 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!response.ok) throw new Error(`Brevo ${response.status}: ${await response.text()}`)
  if (response.status === 204) return {} as T
  return response.json() as Promise<T>
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
