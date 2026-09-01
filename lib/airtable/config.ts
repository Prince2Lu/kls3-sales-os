// Airtable configuration
// Server-side only - never import in client components

let _config: {
  token: string
  baseId: string
  apiUrl: string
} | null = null

function getConfig() {
  if (_config) return _config

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID

  if (!AIRTABLE_TOKEN) {
    throw new Error('AIRTABLE_TOKEN environment variable is not set')
  }

  if (!AIRTABLE_BASE_ID) {
    throw new Error('AIRTABLE_BASE_ID environment variable is not set')
  }

  _config = {
    token: AIRTABLE_TOKEN,
    baseId: AIRTABLE_BASE_ID,
    apiUrl: 'https://api.airtable.com/v0',
  }

  return _config
}

export const config = new Proxy({} as any, {
  get(target, prop) {
    const cfg = getConfig()
    return cfg[prop as keyof typeof cfg]
  },
})

// Table names (exact match with Airtable)
export const TABLE_NAMES = {
  BUSINESS_LINES: 'BUSINESS_LINES',
  COMPANIES: 'COMPANIES',
  CONTACTS: 'CONTACTS',
  OPPORTUNITIES: 'OPPORTUNITIES',
  ACTIVITIES: 'ACTIVITIES',
  TASKS: 'TASKS',
  VALUE_EVENTS: 'VALUE_EVENTS',
  GOALS: 'GOALS',
  STAGE_HISTORY: 'STAGE_HISTORY',
} as const

// Helper to construct Airtable API URL
export function getTableUrl(tableName: string): string {
  return `${config.apiUrl}/${config.baseId}/${encodeURIComponent(tableName)}`
}

// Helper to get authorization headers
export function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${config.token}`,
    'Content-Type': 'application/json',
  }
}
