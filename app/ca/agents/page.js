'use client'

import { useState, useEffect, useCallback } from 'react'
import { Edit2, Ban, UserCheck, UserMinus, Eye } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createAgentSchema, updateAgentSchema } from '@/lib/validations'
import DataTable from '@/components/shared/DataTable'
import ConfirmModal from '@/components/shared/ConfirmModal'
import Link from 'next/link'

function AgentModal({ agent, onClose, onSaved }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const isEdit = !!agent

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(isEdit ? updateAgentSchema : createAgentSchema),
    defaultValues: agent ? { name: agent.user_id?.name, email: agent.user_id?.email, isAvailable: agent.isAvailable } : { isAvailable: true },
  })

  async function onSubmit(data) {
    setLoading(true)
    try {
      const url = isEdit ? `/api/ca/agents/${agent._id}` : '/api/ca/agents'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Failed'); return }
      toast.success(isEdit ? 'Agent updated' : 'Agent created')
      onSaved()
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{isEdit ? 'Edit Agent' : 'New Agent'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className={`form-input ${errors.name ? 'error' : ''}`} {...register('name')} placeholder="Raj Kumar" />
                {errors.name && <span className="form-error">⚠ {errors.name.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" className={`form-input ${errors.email ? 'error' : ''}`} {...register('email')} placeholder="raj@company.com" />
                {errors.email && <span className="form-error">⚠ {errors.email.message}</span>}
              </div>
            </div>

            {!isEdit && (
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input type="password" className={`form-input ${errors.password ? 'error' : ''}`} {...register('password')} placeholder="Min 8 characters" />
                {errors.password && <span className="form-error">⚠ {errors.password.message}</span>}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                className={`form-input ${errors.phone ? 'error' : ''}`}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                pattern="[0-9]{10}"
                {...register('phone')}
                placeholder="9876543210"
              />
              {errors.phone && <span className="form-error">⚠ {errors.phone.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Availability</label>
              <select className="form-select" {...register('isAvailable', { setValueAs: (v) => v === 'true' || v === true })}>
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> Saving...</> : (isEdit ? 'Save Changes' : 'Create Agent')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CAAgentsPage() {
  const toast = useToast()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const fetchAgents = useCallback(async () => {
    const res = await fetch('/api/ca/agents')
    const data = await res.json()
    setAgents(data.agents || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAgents() }, [fetchAgents])

  async function handleDeleteConfirm() {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    const res = await fetch(`/api/ca/agents/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Agent deactivated'); fetchAgents() }
    else toast.error('Failed to deactivate agent')
    setConfirmDelete(null);
  }

  async function handleToggleAvailability(agent) {
    const res = await fetch(`/api/ca/agents/${agent._id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: !agent.isAvailable }),
    })
    if (res.ok) { toast.success(`Agent marked ${!agent.isAvailable ? 'Available' : 'Unavailable'}`); fetchAgents() }
    else toast.error('Failed')
  }

  const available = agents.filter((a) => a.isAvailable).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Agents</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{available} available / {agents.length} total</p>
        </div>
        <button id="ca-new-agent-btn" className="btn btn-primary" onClick={() => setModal({ type: 'create' })}>
          + New Agent
        </button>
      </div>

      <DataTable
        columns={['Agent', 'Email', 'Availability', 'Actions']}
        data={loading ? [] : agents}
        emptyText={loading ? "Loading..." : "No agents yet"}
        emptyIcon="🛵"
        renderRow={(a) => (
          <>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: a.isAvailable ? 'var(--surface-2)' : 'var(--surface-2)',
                  color: a.isAvailable ? 'var(--accent-primary)' : 'var(--text-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.875rem', flexShrink: 0,
                  fontFamily: 'var(--font-mono)'
                }}>
                  {a.user_id?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{a.user_id?.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{a.user_id?.isActive ? 'Active' : 'Deactivated'}</div>
                </div>
              </div>
            </td>
            <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{a.user_id?.email}</td>
            <td>
              <span 
                className="badge" 
                style={
                  a.isAvailable 
                    ? { color: 'var(--success)', background: 'color-mix(in srgb, var(--success) 15%, transparent)', borderColor: 'color-mix(in srgb, var(--success) 30%, transparent)' } 
                    : { color: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 15%, transparent)', borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)' }
                }
              >
                {a.isAvailable ? '● Available' : '● Unavailable'}
              </span>
            </td>
            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                <button className={`btn btn-ghost btn-sm btn-icon ${a.isAvailable ? 'text-warning' : 'text-success'}`} onClick={() => handleToggleAvailability(a)} title={a.isAvailable ? 'Mark Busy' : 'Mark Available'}>
                  {a.isAvailable ? <UserMinus size={18} /> : <UserCheck size={18} />}
                </button>
                <Link href={`/ca/agents/${a._id}`} className="btn btn-ghost btn-sm btn-icon" title="View Shipments">
                  <Eye size={18} />
                </Link>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setModal({ type: 'edit', agent: a })} title="Edit">
                  <Edit2 size={18} />
                </button>
                <button className="btn btn-ghost btn-sm btn-icon text-danger" onClick={() => setConfirmDelete({ id: a._id, name: a.user_id?.name || 'Unknown' })} title="Deactivate">
                  <Ban size={18} />
                </button>
              </div>
            </td>
          </>
        )}
      />

      {modal && (
        <AgentModal
          agent={modal.agent}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchAgents() }}
        />
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Deactivate Agent"
        message={`Are you sure you want to deactivate "${confirmDelete?.name}"? You can reactivate them later.`}
        confirmText="Deactivate"
      />
    </div>
  )
}
