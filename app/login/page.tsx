// Login page - KLS3 Sales OS
// Phase 8: Credentials authentication (email + password)

'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password: password,
        redirect: false,
      })

      if (result?.error) {
        setError('Email ou mot de passe incorrect.')
        setIsLoading(false)
      } else if (result?.ok) {
        // Redirect to home on success
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      setError('Email ou mot de passe incorrect.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <Logo size="lg" />
        </div>

        {/* Card */}
        <div className="bg-background-card border border-border rounded-2xl p-8">
          {/* Title */}
          <h1 className="text-2xl font-bold text-text-primary font-syne text-center mb-2">
            Sales OS
          </h1>

          {/* Subtitle */}
          <p className="text-sm text-text-muted text-center mb-8">
            Accès réservé à l'équipe KLS3
          </p>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-primary mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="votre-email@kls3-dev.com"
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-primary mb-2"
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="text-sm text-red-400 text-center py-2">{error}</div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full"
              size="md"
              disabled={isLoading}
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-xs text-text-muted text-center mt-6">
          Seuls les comptes autorisés peuvent accéder à cette application
        </p>
      </div>
    </div>
  )
}
