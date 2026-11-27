// Login throttling: at most MAX_FAILURES failed attempts per email in WINDOW_MS.
// In memory, per server instance: enough for a small internal team. It resets
// when the instance restarts, which is accepted for V1.

export const MAX_FAILURES = 5
export const WINDOW_MS = 15 * 60 * 1000

const failures = new Map<string, { count: number; firstAt: number }>()

function current(email: string, now: number) {
  const entry = failures.get(email)
  if (entry && now - entry.firstAt >= WINDOW_MS) {
    failures.delete(email)
    return undefined
  }
  return entry
}

/** True when this email must be refused without checking the password. */
export function isLoginBlocked(email: string, now = Date.now()): boolean {
  const entry = current(email, now)
  return !!entry && entry.count >= MAX_FAILURES
}

export function recordLoginFailure(email: string, now = Date.now()): void {
  const entry = current(email, now)
  if (entry) entry.count++
  else failures.set(email, { count: 1, firstAt: now })
}

export function clearLoginFailures(email: string): void {
  failures.delete(email)
}
