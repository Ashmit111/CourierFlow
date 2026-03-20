'use client'

import { Edit2, Trash2, Sprout, Zap, Trophy, ClipboardList, Check } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'
import ConfirmModal from '@/components/shared/ConfirmModal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { planSchema } from '@/lib/validations'
import { z } from 'zod'

function PlanModal({ plan, onClose, onSaved }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const isEdit = !!plan

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(z.object({
      name: z.string().min(1, 'Name is required'),
      price: z.coerce.number().min(0, 'Price must be 0 or more'),
      maxShipments: z.coerce.number().int().positive('Must be positive'),
      maxAgents: z.coerce.number().int().positive('Must be positive'),
      maxHubs: z.coerce.number().int().positive('Must be positive'),
    })),
    defaultValues: plan || { price: 0, maxShipments: 500, maxAgents: 5, maxHubs: 2 },
  })

  async function onSubmit(data) {
    setLoading(true)
    try {
      const url = isEdit ? `/api/sa/plans/${plan._id}` : '/api/sa/plans'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Failed'); return }
      toast.success(isEdit ? 'Plan updated' : 'Plan created')
      onSaved()
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{isEdit ? 'Edit Plan' : 'New Plan'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Plan Name *</label>
              <input className={`form-input ${errors.name ? 'error' : ''}`} {...register('name')} placeholder="Pro" />
              {errors.name && <span className="form-error">⚠ {errors.name.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Price ($/month) *</label>
              <input type="number" step="0.01" className={`form-input ${errors.price ? 'error' : ''}`} {...register('price')} />
              {errors.price && <span className="form-error">⚠ {errors.price.message}</span>}
            </div>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Max Shipments *</label>
                <input type="number" className={`form-input ${errors.maxShipments ? 'error' : ''}`} {...register('maxShipments')} />
                {errors.maxShipments && <span className="form-error">⚠ {errors.maxShipments.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Max Agents *</label>
                <input type="number" className={`form-input ${errors.maxAgents ? 'error' : ''}`} {...register('maxAgents')} />
                {errors.maxAgents && <span className="form-error">⚠ {errors.maxAgents.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Max Hubs *</label>
                <input type="number" className={`form-input ${errors.maxHubs ? 'error' : ''}`} {...register('maxHubs')} />
                {errors.maxHubs && <span className="form-error">⚠ {errors.maxHubs.message}</span>}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> Saving...</> : (isEdit ? 'Save Changes' : 'Create Plan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SAPlansPage() {
  const toast = useToast()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const fetchPlans = useCallback(async () => {
    const res = await fetch('/api/sa/plans')
    const data = await res.json()
    setPlans(data.plans || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  async function handleDelete(id, name) {
    setConfirmDelete({ id, name })
  }

  async function executeDelete() {
    if (!confirmDelete) return
    const res = await fetch(`/api/sa/plans/${confirmDelete.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Plan deleted'); fetchPlans() }
    else toast.error('Failed to delete')
    setConfirmDelete(null)
  }

  const planIcons = { 
    Basic: <Sprout size={40} className="text-success" />, 
    Pro: <Zap size={40} className="text-warning" />, 
    Enterprise: <Trophy size={40} className="text-primary" /> 
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Subscription Plans</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{plans.length} plans configured</p>
        </div>
        <button id="sa-new-plan-btn" className="btn btn-primary" onClick={() => setModal({ type: 'create' })}>
          + New Plan
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <div className="grid-3">
          {plans.map((plan) => (
            <div key={plan._id} className="card card-elevated" style={{ position: 'relative' }}>
              <div className="card-body">
                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                    {planIcons[plan.name] || <ClipboardList size={40} />}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '0.5rem' }}>{plan.name}</h3>
                  <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    ${plan.price}
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>/mo</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  {[
                    ['Shipments', plan.maxShipments >= 999999 ? 'Unlimited' : plan.maxShipments.toLocaleString()],
                    ['Agents', plan.maxAgents >= 999999 ? 'Unlimited' : plan.maxAgents],
                    ['Hubs', plan.maxHubs >= 999999 ? 'Unlimited' : plan.maxHubs],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                      <span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {plan.features?.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    {plan.features.map((f) => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        <Check size={14} className="text-success" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  <button className="btn btn-outline w-full btn-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={() => setModal({ type: 'edit', plan })}>
                    <Edit2 size={16} /> Edit
                  </button>
                  <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)', flexShrink: 0 }} onClick={() => handleDelete(plan._id, plan.name)} title="Delete Plan">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {plans.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-icon">📋</div>
              No plans yet
            </div>
          )}
        </div>
      )}

      {modal && (
        <PlanModal
          plan={modal.plan}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchPlans() }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          isOpen={true}
          title="Delete Plan"
          message={`Are you sure you want to delete the plan "${confirmDelete.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={executeDelete}
          onClose={() => setConfirmDelete(null)}
          isDanger={true}
        />
      )}
    </div>
  )
}
