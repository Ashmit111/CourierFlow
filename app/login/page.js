'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '@/lib/validations'

export default function LoginPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data) {
    setLoading(true)
    setServerError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()

      if (!res.ok) {
        setServerError(json.error || 'Login failed')
        return
      }

      const { role } = json.user
      if (role === 'SA') router.push('/sa/dashboard')
      else if (role === 'CA') router.push('/ca/dashboard')
      else if (role === 'AG') router.push('/ag/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: '📦', label: 'Real-time shipment tracking' },
    { icon: '🗺️', label: 'Live agent GPS on map' },
    { icon: '📱', label: 'QR code generation & scanning' },
    { icon: '📊', label: 'Analytics & audit logs' },
  ]

  return (
    <div className="auth-page">
      {/* Left branding panel */}
      <div className="auth-left" style={{ flex: 1, alignItems: 'center' }}>
        <div style={{ maxWidth: 440, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
            <div
              style={{
                width: 48, height: 48,
                borderRadius: 12,
                background: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                fontWeight: 800,
                color: '#fff',
                fontFamily: 'var(--font-display)',
                boxShadow: '0 4px 14px rgba(245,158,11,0.4)',
              }}
            >
              CF
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>Courier Flow</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Multi-tenant platform</div>
            </div>
          </div>

          <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.15 }}>
            Deliver smarter.<br />
            <span style={{ color: 'var(--primary)' }}>Track everything.</span>
          </h1>

          <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', lineHeight: 1.7 }}>
            A fully integrated logistics platform for courier companies. Manage shipments, hubs, and delivery agents in real time.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {features.map((f) => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 36, height: 36,
                    borderRadius: 8,
                    background: 'var(--primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    flexShrink: 0,
                  }}
                >
                  {f.icon}
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="auth-right" style={{ flex: 1, maxWidth: 'none', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.85rem', fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '0.5rem' }}>
            Welcome back
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Sign in to your account to continue
          </p>
        </div>

        {serverError && (
          <div
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              padding: '0.75rem 1rem',
              color: 'var(--danger)',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
            }}
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="you@company.com"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <span className="form-error">⚠ {errors.email.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && (
                <span className="form-error">⚠ {errors.password.message}</span>
              )}
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>

        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border)',
            textAlign: 'center',
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div>
            New company?{' '}
            <Link href="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
              Register your company
            </Link>
          </div>
          
          <Link href="/track" className="btn btn-outline" style={{ display: 'block', width: '100%', textAlign: 'center', justifyContent: 'center' }}>
            Open Public Tracking Page →
          </Link>
        </div>
        
        </div>
      </div>
    </div>
  )
}
