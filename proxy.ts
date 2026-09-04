// Proxy for route protection (Next.js 16+ convention)
// Phase 8: Protect all Sales OS routes, allow only /login public

import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Public routes (login + auth endpoints)
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/api/auth')

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
