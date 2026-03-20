'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/shared/StatusBadge'
import Timeline from '@/components/shared/Timeline'
import { useToast } from '@/components/ui/Toast'
import { usePusher } from '@/hooks/usePusher'

export default function ShipmentDetailPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const toast = useToast()

  const [shipment, setShipment] = useState(null)
  const [events, setEvents] = useState([])
  const [hubs, setHubs] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)

  // Assign modals
  const [assignHub, setAssignHub] = useState(false)
  const [assignAgent, setAssignAgent] = useState(false)
  const [selectedHub, setSelectedHub] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [assigning, setAssigning] = useState(false)

  async function fetchAll() {
    const [sr, er, hr, ar] = await Promise.all([
      fetch(`/api/ca/shipments/${id}`),
      fetch(`/api/ca/shipments/${id}/events`),
      fetch('/api/ca/hubs'),
      fetch('/api/ca/agents'),
    ])
    const [sd, ed, hd, ad] = await Promise.all([sr.json(), er.json(), hr.json(), ar.json()])
    setShipment(sd.shipment)
    setEvents(ed.events || [])
    setHubs(hd.hubs || [])
    setAgents(ad.agents || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [id])

  // Real-time status updates
  usePusher(
    shipment ? `shipment-${shipment.trackingId}` : null,
    'status-update',
    (data) => {
      setShipment((prev) => prev ? { ...prev, currentStatus: data.status } : prev)
      fetchAll()
      toast.info(`Status updated: ${data.status}`)
    }
  )

  async function handleAssignHub() {
    if (!selectedHub) { toast.error('Select a hub'); return }
    setAssigning(true)
    const res = await fetch(`/api/ca/shipments/${id}/assign-hub`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hubId: selectedHub }),
    })
    const json = await res.json()
    if (res.ok) { toast.success('Hub assigned'); setAssignHub(false); fetchAll() }
    else toast.error(json.error || 'Failed')
    setAssigning(false)
  }

  async function handleAssignAgent() {
    if (!selectedAgent) { toast.error('Select an agent'); return }
    setAssigning(true)
    const res = await fetch(`/api/ca/shipments/${id}/assign-agent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: selectedAgent }),
    })
    const json = await res.json()
    if (res.ok) { toast.success('Agent assigned'); setAssignAgent(false); fetchAll() }
    else toast.error(json.error || 'Failed — ' + json.error)
    setAssigning(false)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
  if (!shipment) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--danger)' }}>Shipment not found</div>

  const canEdit = shipment.currentStatus === 'Created'
  const activeHubs = hubs.filter((h) => h.isActive)
  const assignableAgents = agents.filter((a) => a.isAvailable && a.user_id?.isActive)

  return (
    <div>
      {/* Breadcrumb + Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        <Link href="/ca/shipments" style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>Shipments</Link>
        <span>›</span>
        <code style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{shipment.trackingId}</code>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-primary)' }}>{shipment.trackingId}</h2>
            <StatusBadge status={shipment.currentStatus} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Created {new Date(shipment.createdAt).toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setAssignHub(true)}>Assign Hub</button>
          <button className="btn btn-outline btn-sm" onClick={() => setAssignAgent(true)}>Assign Agent</button>
          {canEdit && (
            <Link href={`/ca/shipments/${id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
          )}
          {shipment.qrCodeUrl && (
            <a href={shipment.qrCodeUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
              View QR
            </a>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        {/* Sender */}
        <div className="card card-elevated">
          <div className="card-header"><h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>📤 Sender</h3></div>
          <div className="card-body">
            {[
              ['Name', shipment.sender?.name],
              ['Phone', shipment.sender?.phone],
              ['City', shipment.sender?.city],
              ['Address', shipment.sender?.address],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)', minWidth: 70 }}>{k}</span>
                <span>{v || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Receiver */}
        <div className="card card-elevated">
          <div className="card-header"><h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>📥 Receiver</h3></div>
          <div className="card-body">
            {[
              ['Name', shipment.receiver?.name],
              ['Phone', shipment.receiver?.phone],
              ['City', shipment.receiver?.city],
              ['Address', shipment.receiver?.address],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)', minWidth: 70 }}>{k}</span>
                <span>{v || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Shipment Info */}
        <div className="card card-elevated">
          <div className="card-header"><h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Package Info</h3></div>
          <div className="card-body">
            {[
              ['Weight', `${shipment.weight} kg`],
              ['Description', shipment.description || '—'],
              ['Hub', shipment.assignedHub?.name || '—'],
              ['Agent', shipment.assignedAgent?.user_id?.name || '—'],
              ['Est. Delivery', shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString() : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)', minWidth: 90 }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* QR Code */}
        <div className="card card-elevated">
          <div className="card-header"><h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>QR Code</h3></div>
          <div className="card-body" style={{ textAlign: 'center' }}>
            {shipment.qrCodeUrl ? (
              <a href={shipment.qrCodeUrl} target="_blank" rel="noreferrer">
                <img src={shipment.qrCodeUrl} alt="QR Code" style={{ width: 160, height: 160, borderRadius: 8 }} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Click to open full size</div>
              </a>
            ) : (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <div className="empty-icon">📱</div>
                <div style={{ fontSize: '0.875rem' }}>QR not available</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card card-elevated">
        <div className="card-header"><h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>📋 Event Timeline</h3></div>
        <div className="card-body">
          {events.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📋</div>No events yet</div>
          ) : (
            <Timeline events={events} />
          )}
        </div>
      </div>

      {/* Proof of delivery */}
      {shipment.currentStatus === 'Delivered' && shipment.proofOfDelivery?.url && (
        <div className="card card-elevated" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header"><h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Proof of Delivery</h3></div>
          <div className="card-body" style={{ textAlign: 'center' }}>
            <a href={shipment.proofOfDelivery.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block' }}>
              <img src={shipment.proofOfDelivery.url} alt="Proof of delivery" style={{ maxWidth: '100%', width: 320, borderRadius: 8, border: '1px solid var(--border)' }} />
            </a>
            {shipment.proofOfDelivery.note && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{shipment.proofOfDelivery.note}</p>
            )}
          </div>
        </div>
      )}

      {/* Assign Hub Modal */}
      {assignHub && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAssignHub(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Assign Hub</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setAssignHub(false)}>✕</button>
            </div>
            <div className="modal-body">
              {activeHubs.length === 0 && (
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, color: 'var(--warning)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  ⚠️ No active hubs available. Activate a hub first.
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Select Hub *</label>
                <select className="form-select" value={selectedHub} onChange={(e) => setSelectedHub(e.target.value)} id="assign-hub-select" disabled={activeHubs.length === 0}>
                  <option value="">— Choose a hub —</option>
                  {activeHubs.map((h) => <option key={h._id} value={h._id}>{h.name} — {h.city}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setAssignHub(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssignHub} disabled={assigning || activeHubs.length === 0}>
                {assigning ? <><span className="spinner" /> Assigning...</> : 'Assign Hub'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Agent Modal */}
      {assignAgent && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAssignAgent(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Assign Agent</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setAssignAgent(false)}>✕</button>
            </div>
            <div className="modal-body">
              {!shipment.assignedHub && (
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, color: 'var(--warning)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  ⚠️ You must assign a hub before assigning an agent.
                </div>
              )}
              {shipment.assignedHub && assignableAgents.length === 0 && (
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, color: 'var(--warning)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  ⚠️ No available active agents right now.
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Select Agent *</label>
                <select className="form-select" value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} id="assign-agent-select" disabled={!shipment.assignedHub || assignableAgents.length === 0}>
                  <option value="">— Choose an agent —</option>
                  {assignableAgents.map((a) => (
                    <option key={a._id} value={a._id}>{a.user_id?.name} (Available)</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setAssignAgent(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssignAgent} disabled={assigning || !shipment.assignedHub || assignableAgents.length === 0}>
                {assigning ? <><span className="spinner" /> Assigning...</> : 'Assign Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
