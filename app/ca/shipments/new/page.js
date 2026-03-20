'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createShipmentSchema } from '@/lib/validations'
import { useToast } from '@/components/ui/Toast'
import Link from 'next/link'
import { z } from 'zod'

const tenDigitPhoneSchema = z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits')

const clientSchema = z.object({
  sender: z.object({
    name: z.string().min(1, 'Name is required'),
    phone: tenDigitPhoneSchema,
    email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
    address: z.string().min(3, 'Address is required'),
    city: z.string().min(2, 'City is required'),
  }),
  receiver: z.object({
    name: z.string().min(1, 'Name is required'),
    phone: tenDigitPhoneSchema,
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
      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className={`form-input ${errors?.[prefix]?.name ? 'error' : ''}`} {...register(`${prefix}.name`)} placeholder="John Doe" />
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
              placeholder="9876543210"
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
          <input className={`form-input ${errors?.[prefix]?.address ? 'error' : ''}`} {...register(`${prefix}.address`)} placeholder="123 Main Street" />
          {errors?.[prefix]?.address && <span className="form-error">⚠ {errors[prefix].address.message}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">City *</label>
          <input className={`form-input ${errors?.[prefix]?.city ? 'error' : ''}`} {...register(`${prefix}.city`)} placeholder="Mumbai" />
          {errors?.[prefix]?.city && <span className="form-error">⚠ {errors[prefix].city.message}</span>}
        </div>
      </div>
    </div>
  )
}

export default function CreateShipmentPage() {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(clientSchema) })

  async function onSubmit(data) {
    setLoading(true)
    try {
      const res = await fetch('/api/ca/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()

      if (!res.ok) {
        if (json.errors) {
          toast.error(Object.values(json.errors).flat().join(', '))
        } else {
          toast.error(json.error || 'Failed to create shipment')
        }
        return
      }

      toast.success('Shipment created! QR code generated.')
      router.push(`/ca/shipments/${json.shipment._id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '0 1rem 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 980 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Link href="/ca/shipments" className="btn btn-ghost btn-sm">← Back</Link>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Create Shipment</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>A QR code will be auto-generated on save</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Sender + Receiver */}
            <div className="grid-2" style={{ gap: '1.5rem' }}>
              <div className="card card-elevated"><div className="card-body"><ContactSection prefix="sender" title="📤 Sender" register={register} errors={errors} /></div></div>
              <div className="card card-elevated"><div className="card-body"><ContactSection prefix="receiver" title="📥 Receiver" register={register} errors={errors} /></div></div>
            </div>

            {/* Package Details */}
            <div className="card card-elevated">
              <div className="card-header"><h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Package Details</h3></div>
              <div className="card-body">
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Weight (kg) *</label>
                    <input
                      type="number"
                      step="0.1"
                      className={`form-input ${errors.weight ? 'error' : ''}`}
                      {...register('weight')}
                      placeholder="1.5"
                    />
                    {errors.weight && <span className="form-error">⚠ {errors.weight.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input className="form-input" {...register('description')} placeholder="Electronics, books, etc." />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Link href="/ca/shipments" className="btn btn-outline">Cancel</Link>
              <button id="create-shipment-submit" type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? <><span className="spinner" /> Adding...</> : '📦 Add Shipment'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
