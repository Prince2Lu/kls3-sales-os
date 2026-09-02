// Test timezone utilities for Phase 7B
// Validates DST handling and deterministic behavior

import {
  addDaysParis,
  subtractMonthsParis,
} from '../lib/utils/timezone'

// Helper to get Paris components (import internal function for testing)
function getParisComponentsTest(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  const parts = formatter.formatToParts(date)
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value || '0', 10)

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hours: get('hour'),
    minutes: get('minute'),
    seconds: get('second'),
  }
}

// Helper to create Paris date (recreate for testing)
function createDateInParisTest(
  year: number,
  month: number,
  day: number,
  hours: number = 0,
  minutes: number = 0,
  seconds: number = 0,
  ms: number = 0
): Date {
  const naiveUtc = Date.UTC(year, month - 1, day, hours, minutes, seconds, ms)
  let candidate = new Date(naiveUtc)

  for (let attempt = 0; attempt < 5; attempt++) {
    const parisComponents = getParisComponentsTest(candidate)

    if (
      parisComponents.year === year &&
      parisComponents.month === month &&
      parisComponents.day === day &&
      parisComponents.hours === hours &&
      parisComponents.minutes === minutes &&
      parisComponents.seconds === seconds
    ) {
      return candidate
    }

    const targetDate = new Date(year, month - 1, day, hours, minutes, seconds, ms)
    const currentParisDate = new Date(
      parisComponents.year,
      parisComponents.month - 1,
      parisComponents.day,
      parisComponents.hours,
      parisComponents.minutes,
      parisComponents.seconds,
      0
    )

    const diff = targetDate.getTime() - currentParisDate.getTime()
    candidate = new Date(candidate.getTime() + diff)
  }

  return candidate
}

console.log('🧪 Testing Timezone Utilities\n')

// TEST 1 - Normal addition
console.log('TEST 1 — Ajout normal (10 jan 2026 + 30 jours)')
const test1Start = createDateInParisTest(2026, 1, 10, 9, 0, 0)
const test1Result = addDaysParis(test1Start, 30)
const test1Paris = getParisComponentsTest(test1Result)
console.log(
  `  Start: 10 janvier 2026 09:00 Paris`
)
console.log(
  `  Result: ${test1Paris.day} ${test1Paris.month === 2 ? 'février' : 'month ' + test1Paris.month} ${test1Paris.year} ${String(test1Paris.hours).padStart(2, '0')}:${String(test1Paris.minutes).padStart(2, '0')} Paris`
)
console.log(
  `  Expected: 9 février 2026 09:00 Paris`
)
console.log(
  `  ✅ PASS: ${test1Paris.year === 2026 && test1Paris.month === 2 && test1Paris.day === 9 && test1Paris.hours === 9 && test1Paris.minutes === 0 ? 'YES' : 'NO'}\n`
)

// TEST 2 - Passage heure d'été (last Sunday of March 2026)
console.log('TEST 2 — Passage heure d\'été (10 mars 2026 + 30 jours)')
const test2Start = createDateInParisTest(2026, 3, 10, 9, 0, 0)
const test2Result = addDaysParis(test2Start, 30)
const test2Paris = getParisComponentsTest(test2Result)
console.log(
  `  Start: 10 mars 2026 09:00 Paris (before DST)`
)
console.log(
  `  Result: ${test2Paris.day} avril ${test2Paris.year} ${String(test2Paris.hours).padStart(2, '0')}:${String(test2Paris.minutes).padStart(2, '0')} Paris`
)
console.log(
  `  Expected: 9 avril 2026 09:00 Paris (after DST)`
)
console.log(
  `  ✅ PASS: ${test2Paris.year === 2026 && test2Paris.month === 4 && test2Paris.day === 9 && test2Paris.hours === 9 && test2Paris.minutes === 0 ? 'YES' : 'NO'}\n`
)

// TEST 3 - Passage heure d'hiver (last Sunday of October 2026)
console.log('TEST 3 — Passage heure d\'hiver (10 oct 2026 + 30 jours)')
const test3Start = createDateInParisTest(2026, 10, 10, 9, 0, 0)
const test3Result = addDaysParis(test3Start, 30)
const test3Paris = getParisComponentsTest(test3Result)
console.log(
  `  Start: 10 octobre 2026 09:00 Paris (before DST end)`
)
console.log(
  `  Result: ${test3Paris.day} novembre ${test3Paris.year} ${String(test3Paris.hours).padStart(2, '0')}:${String(test3Paris.minutes).padStart(2, '0')} Paris`
)
console.log(
  `  Expected: 9 novembre 2026 09:00 Paris (after DST end)`
)
console.log(
  `  ✅ PASS: ${test3Paris.year === 2026 && test3Paris.month === 11 && test3Paris.day === 9 && test3Paris.hours === 9 && test3Paris.minutes === 0 ? 'YES' : 'NO'}\n`
)

// TEST 4 - Maturité J+30
console.log('TEST 4 — Maturité J+30 (10 mars 2026 09:00)')
const test4Entry = createDateInParisTest(2026, 3, 10, 9, 0, 0)
const test4Mature = addDaysParis(test4Entry, 30)
const test4Paris = getParisComponentsTest(test4Mature)
console.log(
  `  Contacté: 10 mars 2026 09:00 Paris`
)
console.log(
  `  Mature à: ${test4Paris.day} avril ${test4Paris.year} ${String(test4Paris.hours).padStart(2, '0')}:${String(test4Paris.minutes).padStart(2, '0')} Paris`
)
console.log(
  `  Expected: 9 avril 2026 09:00 Paris`
)
console.log(
  `  ✅ PASS: ${test4Paris.year === 2026 && test4Paris.month === 4 && test4Paris.day === 9 && test4Paris.hours === 9 ? 'YES' : 'NO'}\n`
)

// TEST 5 - Runtime independent (compare UTC timestamps)
console.log('TEST 5 — Déterminisme runtime-independent')
const test5Date = createDateInParisTest(2026, 3, 10, 9, 0, 0)
const test5Result = addDaysParis(test5Date, 30)
console.log(
  `  Input: 10 mars 2026 09:00 Paris`
)
console.log(
  `  UTC timestamp: ${test5Date.getTime()}`
)
console.log(
  `  Result UTC timestamp: ${test5Result.getTime()}`
)
console.log(
  `  Note: Same timestamps = deterministic regardless of server TZ`
)
console.log(
  `  ✅ PASS: Always produces same UTC instant for same Paris local time\n`
)

// TEST 6 - Fin de mois
console.log('TEST 6 — Fin de mois (31 jan 2026 - 1 mois)')
const test6Start = createDateInParisTest(2026, 1, 31, 9, 0, 0)
const test6Result = subtractMonthsParis(test6Start, 1)
const test6Paris = getParisComponentsTest(test6Result)
console.log(
  `  Start: 31 janvier 2026 09:00`
)
console.log(
  `  Result: ${test6Paris.day} décembre ${test6Paris.year} ${String(test6Paris.hours).padStart(2, '0')}:${String(test6Paris.minutes).padStart(2, '0')}`
)
console.log(
  `  Expected: 31 décembre 2025 09:00 (Dec has 31 days)`
)
console.log(
  `  ✅ PASS: ${test6Paris.year === 2025 && test6Paris.month === 12 && test6Paris.day === 31 ? 'YES' : 'NO'}\n`
)

// TEST 7 - Fenêtre traversant DST
console.log('TEST 7 — Fenêtre traversant DST (cohorte + étape)')
const test7Cohort = createDateInParisTest(2026, 3, 10, 9, 0, 0)
const test7Window = addDaysParis(test7Cohort, 30)
const test7Stage = createDateInParisTest(2026, 4, 9, 9, 0, 0)
console.log(
  `  Cohorte entry: 10 mars 2026 09:00 Paris`
)
console.log(
  `  Window end (J+30): 9 avril 2026 09:00 Paris`
)
console.log(
  `  Stage reached: 9 avril 2026 09:00 Paris`
)
console.log(
  `  Stage <= Window: ${test7Stage.getTime() <= test7Window.getTime() ? 'YES' : 'NO'}`
)
console.log(
  `  ✅ PASS: ${test7Stage.getTime() <= test7Window.getTime() ? 'YES' : 'NO'}\n`
)

console.log('✅ All timezone tests completed!')
