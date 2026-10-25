import type { Metadata, Viewport } from 'next'
import { Syne, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { ConditionalNav } from '@/components/layout/conditional-nav'
import { auth } from '@/auth'
import { getUserByEmail } from '@/lib/airtable'
import { ThemeController } from '@/components/theme/theme-controller'
import { PwaRegister } from '@/components/pwa/pwa-register'

const syne = Syne({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-syne',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'KLS3 Sales OS',
  description: 'Internal Sales Operating System for KLS3',
  applicationName: 'KLS3 Sales OS',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'KLS3',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0d0d' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  const currentUser = session?.user?.email
    ? await getUserByEmail(session.user.email).catch(() => null)
    : null
  const themePreference = currentUser?.theme ?? 'dark'
  const displayName = currentUser
    ? [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ') || currentUser.name
    : session?.user?.name

  return (
    <html
      lang="fr"
      className={`${syne.variable} ${inter.variable}`}
      data-theme={themePreference === 'light' ? 'light' : 'dark'}
      suppressHydrationWarning
    >
      <body className="font-inter min-h-screen">
        <ThemeController preference={themePreference} />
        <PwaRegister />
        <ConditionalNav
          userEmail={session?.user?.email}
          userName={displayName}
        />
        <main className="mobile-app-content container mx-auto min-w-0 overflow-x-hidden px-4 py-4 sm:px-6 sm:py-8">{children}</main>
        <Analytics />
      </body>
    </html>
  )
}
