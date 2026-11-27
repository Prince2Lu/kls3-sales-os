// Auth.js configuration for KLS3 Sales OS
// Phase 8: Airtable-based authentication with Credentials Provider

import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getUserByEmail } from '@/lib/airtable'
import { clearLoginFailures, isLoginBlocked, recordLoginFailure } from '@/lib/auth/login-throttle'
import { recheckSessionUser } from '@/lib/auth/session-check'

export const authConfig = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        // Validate input
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const password = String(credentials.password)
        const email = String(credentials.email).trim().toLowerCase()

        // Too many recent failures: refuse without touching Airtable or bcrypt.
        // The login page shows the same generic error, so nothing reveals
        // whether the email exists.
        if (isLoginBlocked(email)) {
          return null
        }

        // Fetch user from Airtable USERS table
        let user
        try {
          user = await getUserByEmail(email)
        } catch (error) {
          return null
        }

        // User not found, inactive, or wrong password: same answer, counted as a failure
        if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
          recordLoginFailure(email)
          return null
        }

        clearLoginFailures(email)

        // Return user object (without password hash)
        // Include role for session
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async session({ session, token }) {
      // Preserve user info in session
      if (token.sub) {
        session.user.id = token.sub
      }
      if (token.email) {
        session.user.email = token.email
      }
      if (token.name) {
        session.user.name = token.name
      }
      if (token.role) {
        session.user.role = token.role as string
      }
      return session
    },
    async jwt({ token, user }) {
      // Add user info to token on sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
        token.checkedAt = Date.now()
        return token
      }
      // Later requests: a user deactivated in USERS loses access within 15 minutes
      return recheckSessionUser(token, getUserByEmail)
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
} satisfies NextAuthConfig
