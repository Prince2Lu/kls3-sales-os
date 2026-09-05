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
          return null
        }

        const password = String(credentials.password)
        const email = String(credentials.email).trim().toLowerCase()

        // Fetch user from Airtable USERS table
        let user
        try {
          user = await getUserByEmail(email)
        } catch (error) {
          return null
        }

        // User not found
        if (!user) {
          return null
        }

        // User not active
        if (!user.active) {
          return null
        }

        // Verify password with bcrypt
        const isValidPassword = await bcrypt.compare(password, user.passwordHash)

        if (!isValidPassword) {
          return null
        }

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
