'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useToast } from '@/components/ui/Toast'
import Link from 'next/link'
import { z } from 'zod'

const editSchema = z.object({
  sender: z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
    email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
    address: z.string().min(3, 'Address is required'),
    city: z.string().min(2, 'City is required'),
  }),
  receiver: z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
    email: z.string().trim().email('Receiver email is required'),
    address: z.string().min(3, 'Address is required'),
    city: z.string().min(2, 'City is required'),
  }),
  description: z.string().max(500).optional(),
  weight: z.coerce.number().positive('Weight must be greater than 0'),
})

function ContactSection({ prefix, title, register, errors }) {
  return (
    <div>
      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className={`form-input ${errors?.[prefix]?.name ? 'error' : ''}`} {...register(`${prefix}.name`)} />
            {errors?.[prefix]?.name && <span className="form-error">⚠ {errors[prefix].name.message}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Phone *</label>
            <input
              className={`form-input ${errors?.[prefix]?.phone ? 'error' : ''}`}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              pattern="[0-9]{10}"
              {...register(`${prefix}.phone`)}
            />
            {errors?.[prefix]?.phone && <span className="form-error">⚠ {errors[prefix].phone.message}</span>}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Email {prefix === 'receiver' ? '*' : ''}</label>
          <input
            type="email"
            className={`form-input ${errors?.[prefix]?.email ? 'error' : ''}`}
            {...register(`${prefix}.email`)}
            placeholder={prefix === 'receiver' ? 'customer@example.com' : 'optional@example.com'}
          />
          {errors?.[prefix]?.email && <span className="form-error">⚠ {errors[prefix].email.message}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Address *</label>
          <input className={`form-input ${errors?.[prefix]?.address ? 'error' : ''}`} {...register(`${prefix}.address`)} />
          {errors?.[prefix]?.address && <span className="form-error">⚠ {errors[prefix].address.message}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">City *</label>
          <input className={`form-input ${errors?.[prefix]?.city ? 'error' : ''}`} {...register(`${prefix}.city`)} />
          {errors?.[prefix]?.city && <span className="form-error">⚠ {errors[prefix].city.message}</span>}
        </div>
      </div>
    </div>
  )
}

export default function EditShipmentPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [shipment, setShipment] = useState(null)
  const [fetching, setFetching] = useState(true)

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(editSchema) })

  useEffect(() => {
    let mounted = true

    async function loadShipment() {
      try {
        const r = await fetch(`/api/ca/shipments/${id}`)
        const data = await r.json()

        if (!mounted) return

        const s = data.shipment
        if (!r.ok || !s) {
          toast.error(data.error || 'Shipment not found')
          router.push('/ca/shipments')
          return
        }

        if (s.currentStatus === 'Delivered') {
          toast.error('Delivered shipments cannot be edited')
          router.push(`/ca/shipments/${id}`)
          return
        }

        setShipment(s)
        reset({ sender: s.sender, receiver: s.receiver, description: s.description, weight: s.weight })
      } catch {
        if (!mounted) return
        toast.error('Failed to load shipment details')
        router.push(`/ca/shipments/${id}`)
      } finally {
        if (mounted) setFetching(false)
      }
    }

    loadShipment()

    return () => {
      mounted = false
    }
  }, [id, reset, router, toast])

  async function onSubmit(data) {
    setLoading(true)
    try {
      const res = await fetch(`/api/ca/shipments/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Failed to update'); return }
      toast.success('Shipment updated')
      router.push(`/ca/shipments/${id}`)
    } finally { setLoading(false) }
  }

  if (fetching) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '0 1rem 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 980 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Link href={`/ca/shipments/${id}`} className="btn btn-ghost btn-sm">← Back</Link>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Edit Shipment</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>{shipment?.trackingId}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="grid-2" style={{ gap: '1.5rem' }}>
              <div className="card card-elevated"><div className="card-body"><ContactSection prefix="sender" title="📤 Sender" register={register} errors={errors} /></div></div>
              <div className="card card-elevated"><div className="card-body"><ContactSection prefix="receiver" title="📥 Receiver" register={register} errors={errors} /></div></div>
            </div>

            <div className="card card-elevated">
              <div className="card-header"><h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Package Details</h3></div>
              <div className="card-body">
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Weight (kg) *</label>
                    <input type="number" step="0.1" className={`form-input ${errors.weight ? 'error' : ''}`} {...register('weight')} />
                    {errors.weight && <span className="form-error">⚠ {errors.weight.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input className="form-input" {...register('description')} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Link href={`/ca/shipments/${id}`} className="btn btn-outline">Cancel</Link>
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? <><span className="spinner" /> Saving...</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
