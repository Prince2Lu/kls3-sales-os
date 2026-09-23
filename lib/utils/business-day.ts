const PARIS_TIME_ZONE = 'Europe/Paris'

function parisParts(date: Date): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PARIS_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]))
}

function parisLocalToUtc(year: number, month: number, day: number, hour: number): Date {
  let timestamp = Date.UTC(year, month - 1, day, hour)
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = parisParts(new Date(timestamp))
    const representedAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second)
    timestamp -= representedAsUtc - Date.UTC(year, month - 1, day, hour)
  }
  return new Date(timestamp)
}

export function nextBusinessDayAtNineParis(from = new Date()): Date {
  const current = parisParts(from)
  const candidate = new Date(Date.UTC(current.year, current.month - 1, current.day + 1))
  while (candidate.getUTCDay() === 0 || candidate.getUTCDay() === 6) {
    candidate.setUTCDate(candidate.getUTCDate() + 1)
  }
  return parisLocalToUtc(candidate.getUTCFullYear(), candidate.getUTCMonth() + 1, candidate.getUTCDate(), 9)
}


export function emailReplyFollowUpDueParis(from = new Date()): Date {
  const current = parisParts(from)
  const weekday = new Date(Date.UTC(current.year, current.month - 1, current.day)).getUTCDay()
  const isBusinessDay = weekday !== 0 && weekday !== 6

  if (isBusinessDay && current.hour < 16) {
    return from
  }

  return nextBusinessDayAtNineParis(from)
}
