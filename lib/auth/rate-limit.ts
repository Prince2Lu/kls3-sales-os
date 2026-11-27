// Fixed-window rate limiter, in memory per server instance.
// Enough to stop a single client flooding a public endpoint (V1).

const windows = new Map<string, { count: number; startedAt: number }>()

export function allowRequest(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const entry = windows.get(key)
  if (!entry || now - entry.startedAt >= windowMs) {
    windows.set(key, { count: 1, startedAt: now })
    if (windows.size > 10000) {
      for (const [k, v] of windows) if (now - v.startedAt >= windowMs) windows.delete(k)
    }
    return true
  }
  entry.count++
  return entry.count <= limit
}

export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}
