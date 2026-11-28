// ESLint flat config (Next.js 16 removed `next lint`: run `npm run lint`, i.e. the ESLint CLI)
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Existing debt, visible as warnings instead of blocking CI.
    // Turn each one back to 'error' once its warnings are fixed (Trello #55).
    rules: {
      // Pages destructure Promise.all into let, then reassign only the scoped rows (scopeCrmData).
      'prefer-const': ['error', { destructuring: 'all' }],
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
  {
    // The test harness runs bundles in a vm context that needs a `module` object.
    files: ['scripts/test-crm-workflows.mjs'],
    rules: { '@next/next/no-assign-module-variable': 'off' },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
  ]),
])

export default eslintConfig
