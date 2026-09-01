// KLS3 Design System Tokens
// Based on CLAUDE.md sections 36-42

export const colors = {
  // Backgrounds
  bg: {
    primary: '#0D0D0D',
    card: '#111111',
    kpiGroup: 'rgba(255, 255, 255, 0.06)',
  },

  // Accent
  accent: '#4B7BF5',

  // Text
  text: {
    primary: '#F0EDE8',
    muted: 'rgba(240, 237, 232, 0.45)',
  },

  // Borders
  border: {
    standard: 'rgba(255, 255, 255, 0.07)',
    nav: 'rgba(240, 237, 232, 0.35)',
  },
} as const

export const typography = {
  fontFamily: {
    display: 'var(--font-syne)',
    body: 'var(--font-inter)',
  },
  weights: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const

export const spacing = {
  kpiGroupGap: '1px',
} as const

export const borderRadius = {
  card: '16px',
  kpiGroup: '20px',
  button: '100px', // pill shape
} as const

export const animation = {
  duration: {
    fast: '0.2s',
    normal: '0.45s',
  },
  easing: {
    out: 'cubic-bezier(0.33, 1, 0.68, 1)',
  },
} as const
