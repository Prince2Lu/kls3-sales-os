// Proxy for route protection (Next.js 16+ convention)
// Phase 8: Protect Sales OS routes; the Brevo webhook authenticates with its own secret header.

import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // The webhook must be reachable without a CRM session; its handler checks the shared secret.
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/api/auth') || pathname === '/api/brevo/webhook'

  // If not logged in and trying to access protected route
  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // If logged in and trying to access login page, redirect to home
  if (isLoggedIn && pathname === '/login') {
    const homeUrl = new URL('/', req.url)
    return NextResponse.redirect(homeUrl)
  }

  // Allow request to proceed
  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
