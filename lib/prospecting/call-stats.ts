// Pure helpers for prospecting call counters.

/** e.g. "Eric 4 · Lilian 2": calls per owner, busiest first (no hard-coded names, Trello #53). */
export function callsByOwner(calls: Array<{ owner?: string | null }>): string {
  const counts = new Map<string, number>()
  for (const call of calls) {
    if (!call.owner) continue
    counts.set(call.owner, (counts.get(call.owner) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
    .map(([owner, count]) => `${owner} ${count}`)
    .join(' · ')
}
