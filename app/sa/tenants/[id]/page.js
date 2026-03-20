'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/shared/StatusBadge'
import { useToast } from '@/components/ui/Toast'

export default function SATenantDetailPage({ params }) {
  const { id } = use(params)
  const toast = useToast()
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState([])
  const [assignPlan, setAssignPlan] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/sa/tenants/${id}`).then((r) => r.json()),
      fetch('/api/sa/plans').then((r) => r.json()),
    ]).then(([td, pd]) => {
      setTenant(td.tenant)
      setPlans(pd.plans || [])
      setSelectedPlan(td.tenant?.subscriptionPlan?._id || '')
      setLoading(false)
    })
  }, [id])

  async function handleAssignPlan() {
    if (!selectedPlan) { toast.error('Select a plan'); return }
    setAssigning(true)
    const res = await fetch(`/api/sa/tenants/${id}/assign-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: selectedPlan }),
    })
    const json = await res.json()
    if (res.ok) { toast.success('Plan assigned'); setTenant(json.tenant); setAssignPlan(false) }
    else toast.error(json.error || 'Failed')
    setAssigning(false)
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
  if (!tenant) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger)' }}>Tenant not found</div>

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        <Link href="/sa/tenants" style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>Tenants</Link>
        <span>›</span>
        <span>{tenant.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '0.25rem' }}>{tenant.name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <code style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{tenant.domain}</code>
            <StatusBadge status={tenant.status} />
            {tenant.subscriptionPlan && (
              <span className="badge badge-sorting">{tenant.subscriptionPlan.name} Plan</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={() => setAssignPlan(true)}>
            Assign Plan
          </button>
          <Link href={`/sa/tenants`} className="btn btn-ghost">← Back</Link>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid-2">
        <div className="card card-elevated">
          <div className="card-header"><h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Tenant Info</h3></div>
          <div className="card-body">
            <table style={{ width: '100%' }}>
              <tbody>
                {[
                  ['Company Name', tenant.name],
                  ['Domain', tenant.domain],
                  ['Status', <StatusBadge key="s" status={tenant.status} />],
                  ['Plan', tenant.subscriptionPlan?.name || '—'],
                  ['Created', new Date(tenant.createdAt).toLocaleString()],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', width: 140 }}>{label}</td>
                    <td style={{ padding: '0.5rem 0', fontSize: '0.875rem' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card card-elevated">
          <div className="card-header"><h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Subscription Plan</h3></div>
          <div className="card-body">
            {tenant.subscriptionPlan ? (
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>{tenant.subscriptionPlan.name}</div>
                <div style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '1rem' }}>
                  ${tenant.subscriptionPlan.price}<span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>/month</span>
                </div>
                {tenant.subscriptionPlan.features?.map((f) => (
                  <div key={f} style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>✓ {f}</div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.875rem' }}>No plan assigned</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => setAssignPlan(true)}>
                  Assign Plan
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Plan Modal */}
      {assignPlan && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAssignPlan(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Assign Subscription Plan</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setAssignPlan(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Select Plan *</label>
                <select className="form-select" value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)} id="assign-plan-select">
                  <option value="">— Choose a plan —</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>{p.name} — ${p.price}/mo</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setAssignPlan(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssignPlan} disabled={assigning}>
                {assigning ? <><span className="spinner" /> Assigning...</> : 'Assign Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
