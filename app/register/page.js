'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema } from '@/lib/validations'

function previewDomain(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || 'tenant'
}

export default function RegisterPage() {
  const router = useRouter()
  const [plans, setPlans] = useState([])
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(
      registerSchema.refine((d) => true, {}) // full zod validation
    ),
  })

  useEffect(() => {
    fetch('/api/public/plans')
      .then((r) => r.json())
      .then((d) => setPlans(d.plans || []))
      .catch(() => {})
  }, [])

  async function onSubmit(data) {
    setLoading(true)
    setServerError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()

      if (!res.ok) {
        setServerError(json.error || 'Registration failed')
        return
      }

      router.push('/ca/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const planIcons = { Basic: '🌱', Pro: '⚡', Enterprise: '🏆' }
  const generatedDomain = previewDomain(watch('companyName'))

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: 640 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ 
            width: 48, height: 48, background: 'var(--accent-primary)', 
            borderRadius: 12, margin: '0 auto 1.25rem', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', color: '#fff', 
            fontWeight: 800, fontSize: '1.3rem', fontFamily: 'var(--font-display)',
            boxShadow: '0 4px 14px rgba(245,158,11,0.4)'
          }}>
            CF
          </div>
          <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '0.5rem' }}>
            Register your company
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Create a tenant account to manage your deliveries
          </p>
        </div>

        <div className="card">
          <div className="card-body">
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Company info */}
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Company Info
                  </h3>
                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-company">Company Name</label>
                    <input
                      id="reg-company"
                      className={`form-input ${errors.companyName ? 'error' : ''}`}
                      placeholder="Acme Logistics"
                      {...register('companyName')}
                    />
                    {errors.companyName && <span className="form-error">⚠ {errors.companyName.message}</span>}
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Domain will be auto-generated: <code style={{ fontFamily: 'var(--font-mono)' }}>{generatedDomain}</code>
                    </div>
                  </div>
                </div>

                {/* Admin account */}
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Admin Account
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="reg-name">Full Name</label>
                      <input
                        id="reg-name"
                        className={`form-input ${errors.adminName ? 'error' : ''}`}
                        placeholder="John Smith"
                        {...register('adminName')}
                      />
                      {errors.adminName && <span className="form-error">⚠ {errors.adminName.message}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="reg-email">Email Address</label>
                      <input
                        id="reg-email"
                        type="email"
                        className={`form-input ${errors.email ? 'error' : ''}`}
                        placeholder="admin@acme.com"
                        {...register('email')}
                      />
                      {errors.email && <span className="form-error">⚠ {errors.email.message}</span>}
                    </div>

                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="reg-password">Password</label>
                        <input
                          id="reg-password"
                          type="password"
                          className={`form-input ${errors.password ? 'error' : ''}`}
                          placeholder="Min 8 chars, 1 uppercase, 1 number"
                          {...register('password')}
                        />
                        {errors.password && <span className="form-error">⚠ {errors.password.message}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
                        <input
                          id="reg-confirm"
                          type="password"
                          className={`form-input`}
                          placeholder="Repeat password"
                          {...register('confirmPassword')}
                        />
                        {errors.confirmPassword && <span className="form-error">⚠ {errors.confirmPassword.message}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plan selection */}
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Select Plan
                  </h3>
                  {errors.planId && <span className="form-error" style={{ marginBottom: '0.75rem', display: 'flex' }}>⚠ {errors.planId.message}</span>}

                  <div className="grid-3" style={{ gap: '0.75rem' }}>
                    {plans.map((plan) => (
                      <label
                        key={plan._id}
                        htmlFor={`plan-${plan._id}`}
                        style={{ cursor: 'pointer' }}
                      >
                        <input
                          type="radio"
                          id={`plan-${plan._id}`}
                          value={plan._id}
                          style={{ display: 'none' }}
                          {...register('planId')}
                        />
                        <div
                          style={{
                            background: 'var(--surface-2)',
                            border: '2px solid var(--border)',
                            borderRadius: 10,
                            padding: '1rem',
                            textAlign: 'center',
                            transition: 'border-color 0.15s',
                          }}
                          className="plan-card"
                        >
                          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                            {planIcons[plan.name] || '📋'}
                          </div>
                          <div style={{ fontWeight: 700, marginBottom: '0.25rem', fontFamily: 'var(--font-display)' }}>{plan.name}</div>
                          <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
                            ${plan.price}<span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>/mo</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {plan.maxShipments === 999999 ? 'Unlimited' : plan.maxShipments} shipments
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <style>{`
                    input[type=radio]:checked + .plan-card {
                      border-color: var(--primary) !important;
                      background: var(--primary-light) !important;
                    }
                  `}</style>
                </div>

                <button
                  id="register-submit-btn"
                  type="submit"
                  className="btn btn-primary btn-lg w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="spinner" /> Creating account...</>
                  ) : (
                    'Create Company Account'
                  )}
                </button>
              </div>
            </form>

            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
