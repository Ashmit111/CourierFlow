'use client'

import { useState, useEffect, useCallback } from 'react'
import { Edit2, Trash2, MapPin, Store } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { hubSchema } from '@/lib/validations'
import ConfirmModal from '@/components/shared/ConfirmModal'

function HubModal({ hub, onClose, onSaved }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const isEdit = !!hub

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(isEdit ? hubSchema.partial() : hubSchema),
    defaultValues: hub || { isActive: true },
  })

  async function onSubmit(data) {
    setLoading(true)
    try {
      const url = isEdit ? `/api/ca/hubs/${hub._id}` : '/api/ca/hubs'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Failed'); return }
      toast.success(isEdit ? 'Hub updated' : 'Hub created')
      onSaved()
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{isEdit ? 'Edit Hub' : 'New Hub'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Hub Name *</label>
              <input className={`form-input ${errors.name ? 'error' : ''}`} {...register('name')} placeholder="Central Hub" />
              {errors.name && <span className="form-error">⚠ {errors.name.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Address *</label>
              <input className={`form-input ${errors.address ? 'error' : ''}`} {...register('address')} placeholder="123 Main Street" />
              {errors.address && <span className="form-error">⚠ {errors.address.message}</span>}
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">City *</label>
                <input className={`form-input ${errors.city ? 'error' : ''}`} {...register('city')} placeholder="Mumbai" />
                {errors.city && <span className="form-error">⚠ {errors.city.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" {...register('isActive', { setValueAs: (v) => v === 'true' || v === true })}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> Saving...</> : (isEdit ? 'Save Changes' : 'Create Hub')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CAHubsPage() {
  const toast = useToast()
  const [hubs, setHubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const fetchHubs = useCallback(async () => {
    const res = await fetch('/api/ca/hubs')
    const data = await res.json()
    setHubs(data.hubs || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchHubs() }, [fetchHubs])

  async function handleDeleteConfirm() {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    const res = await fetch(`/api/ca/hubs/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Hub deleted'); fetchHubs() }
    else toast.error('Failed to delete')
    setConfirmDelete(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Hubs</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{hubs.length} sorting hubs</p>
        </div>
        <button id="ca-new-hub-btn" className="btn btn-primary" onClick={() => setModal({ type: 'create' })}>
          + New Hub
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
      ) : hubs.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🏪</div>No hubs yet. Create your first hub.</div>
      ) : (
        <div className="grid-3">
          {hubs.map((hub) => (
            <div key={hub._id} className="card card-elevated" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: hub.isActive ? 'var(--success)' : 'var(--danger)' }} />
              <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'var(--surface-2)', color: 'var(--accent-primary)' }}>
                    <Store size={26} />
                  </div>
                  <span 
                    className="badge" 
                    style={
                      hub.isActive 
                        ? { color: 'var(--success)', background: 'color-mix(in srgb, var(--success) 15%, transparent)', borderColor: 'color-mix(in srgb, var(--success) 30%, transparent)' } 
                        : { color: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 15%, transparent)', borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)' }
                    }
                  >
                    {hub.isActive ? '● Active' : '● Inactive'}
                  </span>
                </div>
                
                <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text)' }}>
                  {hub.name}
                </h3>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                    <MapPin size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>{hub.address}</p>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600, marginLeft: '1.75rem', marginBottom: '1.25rem' }}>{hub.city}</p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-outline w-full btn-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={() => setModal({ type: 'edit', hub })}>
                    <Edit2 size={16} /> Edit
                  </button>
                  <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)', flexShrink: 0 }} onClick={() => setConfirmDelete({ id: hub._id, name: hub.name })} title="Delete Hub">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <HubModal
          hub={modal.hub}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchHubs() }}
        />
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Hub"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  )
}
