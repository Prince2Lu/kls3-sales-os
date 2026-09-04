// Auth.js configuration for KLS3 Sales OS
// Phase 8: Airtable-based authentication with Credentials Provider

import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getUserByEmail } from '@/lib/airtable'

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
          console.log('[AUTH_PROD] Missing credentials')
          return null
        }

        const password = String(credentials.password)
        const email = String(credentials.email).trim().toLowerCase()

        console.log('[AUTH_PROD] emailNormalized:', email)
        console.log('[AUTH_PROD] airtableTokenConfigured:', !!process.env.AIRTABLE_TOKEN)
        console.log('[AUTH_PROD] airtableBaseConfigured:', !!process.env.AIRTABLE_BASE_ID)

        // Fetch user from Airtable USERS table
        let user
        try {
          user = await getUserByEmail(email)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.log('[AUTH_PROD] airtableLookupError:', errorMessage)
          return null
        }

        console.log('[AUTH_PROD] userFound:', !!user)

        // User not found
        if (!user) {
          return null
        }

        console.log('[AUTH_PROD] userName:', user.name)
        console.log('[AUTH_PROD] role:', user.role)
        console.log('[AUTH_PROD] active:', user.active)
        console.log('[AUTH_PROD] passwordHashPresent:', !!user.passwordHash)

        // User not active
        if (!user.active) {
          console.log('[AUTH_PROD] User not active')
          return null
        }

        // Verify password with bcrypt
        const isValidPassword = await bcrypt.compare(password, user.passwordHash)
        console.log('[AUTH_PROD] bcryptCompare:', isValidPassword)

        if (!isValidPassword) {
          return null
        }

        console.log('[AUTH_PROD] Authentication successful')

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
      }
      return token
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
} satisfies NextAuthConfig
