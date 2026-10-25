'use client'

import { useEffect } from 'react'

export type ThemePreference = 'dark' | 'light' | 'system'

export function applyThemePreference(preference: ThemePreference) {
  const resolved =
    preference === 'system'
      ? window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
      : preference

  document.documentElement.dataset.theme = resolved
  document.documentElement.dataset.themePreference = preference
}

export function ThemeController({
  preference,
}: {
  preference: ThemePreference
}) {
  useEffect(() => {
    applyThemePreference(preference)

    if (preference !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: light)')
    const listener = () => applyThemePreference('system')
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [preference])

  return null
}
