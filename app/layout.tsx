import type { Metadata } from 'next'
import { Syne, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { ConditionalNav } from '@/components/layout/conditional-nav'
import { auth } from '@/auth'

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
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()

  return (
    <html lang="fr" className={`${syne.variable} ${inter.variable}`}>
      <body className="font-inter min-h-screen">
        <ConditionalNav
          userEmail={session?.user?.email}
          userName={session?.user?.name}
        />
        <main className="container mx-auto min-w-0 overflow-x-hidden px-4 py-4 sm:px-6 sm:py-8">{children}</main>
        <Analytics />
      </body>
    </html>
  )
}
