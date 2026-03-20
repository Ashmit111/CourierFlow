'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/shared/StatusBadge'
import DataTable from '@/components/shared/DataTable'
import ConfirmModal from '@/components/shared/ConfirmModal'
import { Eye, Edit2, PauseCircle, PlayCircle, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createTenantWithAdminSchema, updateTenantSchema } from '@/lib/validations'

function previewDomain(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || 'tenant'
}

function TenantModal({ tenant, plans, onClose, onSaved }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const isEdit = !!tenant

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(isEdit ? updateTenantSchema : createTenantWithAdminSchema),
    defaultValues: tenant ? {
      name: tenant.name,
      status: tenant.status,
      subscriptionPlan: tenant.subscriptionPlan?._id || '',
    } : {
      status: 'active',
      subscriptionPlan: '',
      adminName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })
  const generatedDomain = previewDomain(watch('name'))

  async function onSubmit(data) {
    setLoading(true)
    try {
      const url = isEdit ? `/api/sa/tenants/${tenant._id}` : '/api/sa/tenants'
      const method = isEdit ? 'PUT' : 'POST'
      const payload = isEdit ? data : { ...data }
      if (!isEdit) delete payload.confirmPassword
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Failed'); return }
      toast.success(isEdit ? 'Tenant updated' : 'Tenant created')
      onSaved()
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{isEdit ? 'Edit Tenant' : 'New Tenant'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Company Name *</label>
              <input className={`form-input ${errors.name ? 'error' : ''}`} {...register('name')} placeholder="Acme Corp" />
              {errors.name && <span className="form-error">⚠ {errors.name.message}</span>}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {isEdit
                ? <>Domain: <code style={{ fontFamily: 'var(--font-mono)' }}>{tenant?.domain}</code> (auto-updates if company name changes)</>
                : <>Domain will be auto-generated: <code style={{ fontFamily: 'var(--font-mono)' }}>{generatedDomain}</code></>
              }
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" {...register('status')}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Subscription Plan</label>
                <select className="form-select" {...register('subscriptionPlan')}>
                  <option value="">— None —</option>
                  {plans.map((p) => <option key={p._id} value={p._id}>{p.name} (${p.price}/mo)</option>)}
                </select>
                {errors.subscriptionPlan && <span className="form-error">⚠ {errors.subscriptionPlan.message}</span>}
              </div>
            </div>

            {!isEdit && (
              <>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Admin Account
                  </h4>
                </div>

                <div className="form-group">
                  <label className="form-label">Admin Name *</label>
                  <input className={`form-input ${errors.adminName ? 'error' : ''}`} {...register('adminName')} placeholder="John Smith" />
                  {errors.adminName && <span className="form-error">⚠ {errors.adminName.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Admin Email *</label>
                  <input type="email" className={`form-input ${errors.email ? 'error' : ''}`} {...register('email')} placeholder="admin@acme.com" />
                  {errors.email && <span className="form-error">⚠ {errors.email.message}</span>}
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input
                      type="password"
                      className={`form-input ${errors.password ? 'error' : ''}`}
                      {...register('password')}
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                    />
                    {errors.password && <span className="form-error">⚠ {errors.password.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm Password *</label>
                    <input type="password" className={`form-input ${errors.confirmPassword ? 'error' : ''}`} {...register('confirmPassword')} placeholder="Repeat password" />
                    {errors.confirmPassword && <span className="form-error">⚠ {errors.confirmPassword.message}</span>}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> Saving...</> : (isEdit ? 'Save Changes' : 'Create Tenant')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SATenantsPage() {
  const toast = useToast()
  const [tenants, setTenants] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | {type:'create'|'edit', tenant?}
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchData = useCallback(async () => {
    const [tr, pr] = await Promise.all([
      fetch('/api/sa/tenants', { cache: 'no-store' }),
      fetch('/api/sa/plans', { cache: 'no-store' }),
    ])
    const [td, pd] = await Promise.all([tr.json(), pr.json()])
    setTenants(td.tenants || [])
    setPlans(pd.plans || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleStatus(id, status) {
    const res = await fetch(`/api/sa/tenants/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    if (res.ok) { toast.success(`Tenant ${status}`); fetchData() }
    else toast.error('Failed to update status')
  }

  async function handleDelete(id, name) {
    setConfirmDelete({ id, name })
  }

  async function executeDelete() {
    if (!confirmDelete) return
    const res = await fetch(`/api/sa/tenants/${confirmDelete.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Tenant deleted'); fetchData() }
    else toast.error('Failed to delete')
    setConfirmDelete(null)
  }

  const filtered = tenants.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.domain.includes(search.toLowerCase())
    const matchStatus = !statusFilter || t.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Tenants</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{tenants.length} total companies</p>
        </div>
        <button id="sa-new-tenant-btn" className="btn btn-primary" onClick={() => setModal({ type: 'create' })}>
          + New Tenant
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        <input
          className="form-input"
          style={{ maxWidth: 260 }}
          placeholder="Search by name or domain..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          id="tenant-search"
        />
        <select className="form-select" style={{ maxWidth: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} id="tenant-status-filter">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <DataTable
        columns={['Company', 'Domain', 'Plan', 'Status', 'Created', 'Actions']}
        data={loading ? [] : filtered}
        emptyText={loading ? "Loading..." : "No tenants found"}
        emptyIcon="🏢"
        renderRow={(t) => (
          <>
            <td><div style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>{t.name}</div></td>
            <td><code style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{t.domain}</code></td>
            <td>{t.subscriptionPlan?.name || <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
            <td><StatusBadge status={t.status} /></td>
            <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                <Link href={`/sa/tenants/${t._id}`} className="btn btn-ghost btn-icon" title="View">
                  <Eye size={18} />
                </Link>
                <button className="btn btn-ghost btn-icon" onClick={() => setModal({ type: 'edit', tenant: t })} title="Edit">
                  <Edit2 size={18} />
                </button>
                {t.status === 'active'
                  ? <button className="btn btn-ghost btn-icon text-warning" onClick={() => handleStatus(t._id, 'suspended')} title="Suspend"><PauseCircle size={18} /></button>
                  : <button className="btn btn-ghost btn-icon text-success" onClick={() => handleStatus(t._id, 'active')} title="Activate"><PlayCircle size={18} /></button>
                }
                <button className="btn btn-ghost btn-icon text-danger" onClick={() => handleDelete(t._id, t.name)} title="Delete"><Trash2 size={18} /></button>
              </div>
            </td>
          </>
        )}
      />

      {modal && (
        <TenantModal
          tenant={modal.tenant}
          plans={plans}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchData() }}
        />
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={executeDelete}
        title="Delete Tenant"
        message={`Delete "${confirmDelete?.name}"? This will deactivate all their users.`}
        confirmText="Delete"
        isDanger={true}
      />
    </div>
  )
}
