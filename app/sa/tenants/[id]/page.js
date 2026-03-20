'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/shared/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import { Package, CheckCircle2, XCircle, Building2, Users } from 'lucide-react'

export default function SATenantDetailPage({ params }) {
  const { id } = use(params)
  const toast = useToast()
  const [tenant, setTenant] = useState(null)
  const [summary, setSummary] = useState(null)
  const [shipments, setShipments] = useState([])
  const [hubs, setHubs] = useState([])
  const [agents, setAgents] = useState([])
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
      setSummary(td.summary || null)
      setShipments(td.shipments || [])
      setHubs(td.hubs || [])
      setAgents(td.agents || [])
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

  const derivedSummary = {
    totalShipments: shipments.length,
    deliveredShipments: shipments.filter((s) => s.currentStatus === 'Delivered').length,
    failedShipments: shipments.filter((s) => s.currentStatus === 'Failed').length,
    totalHubs: hubs.length,
    totalAgents: agents.length,
  }
  const ops = summary || derivedSummary

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
          <div className="card-header"><h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Tenant Operations</h3></div>
          <div className="card-body">
            <div>
              <div className="grid-2" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
                {[
                  { label: 'Total Shipments', value: ops.totalShipments, icon: <Package size={16} />, color: 'var(--primary)' },
                  { label: 'Delivered', value: ops.deliveredShipments, icon: <CheckCircle2 size={16} />, color: 'var(--success)' },
                  { label: 'Failed', value: ops.failedShipments, icon: <XCircle size={16} />, color: 'var(--danger)' },
                  { label: 'Total Hubs', value: ops.totalHubs, icon: <Building2 size={16} />, color: 'var(--accent-secondary)' },
                  { label: 'Total Agents', value: ops.totalAgents, icon: <Users size={16} />, color: 'var(--accent-primary)' },
                ].map((metric) => (
                  <div key={metric.label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.65rem 0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: metric.color, marginBottom: '0.25rem' }}>
                      {metric.icon}
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{metric.label}</span>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{metric.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                  Hubs ({ops.totalHubs})
                </div>
                {hubs.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {hubs.map((hub) => (
                      <span key={hub._id} className="badge" style={{ fontSize: '0.72rem' }}>
                        {hub.name} ({hub.city})
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>No hubs available</div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                  Agents ({ops.totalAgents})
                </div>
                {agents.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {agents.map((agent) => (
                      <div key={agent._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.8rem', padding: '0.4rem 0.6rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                        <span>{agent.user_id?.name || 'Unnamed Agent'}</span>
                        <span style={{ color: agent.isAvailable ? 'var(--success)' : 'var(--warning)' }}>
                          {agent.isAvailable ? 'Available' : 'Busy'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>No agents available</div>
                )}
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card card-elevated" style={{ marginTop: '1rem' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Tenant Shipments</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{shipments.length} total</span>
        </div>
        <div className="table-wrap">
          {shipments.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Tracking ID</th>
                  <th>Status</th>
                  <th>Route</th>
                  <th style={{ textAlign: 'right' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment) => (
                  <tr key={shipment._id}>
                    <td>
                      <code style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>{shipment.trackingId}</code>
                    </td>
                    <td><StatusBadge status={shipment.currentStatus} /></td>
                    <td style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                      {shipment.sender?.city || '—'} → {shipment.receiver?.city || '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(shipment.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{ margin: '0.75rem' }}>
              <div className="empty-icon">📦</div>
              <div>No shipments</div>
            </div>
          )}
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
