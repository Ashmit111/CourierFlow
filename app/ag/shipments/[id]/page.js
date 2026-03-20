'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/shared/StatusBadge'
import Timeline from '@/components/shared/Timeline'
import { useToast } from '@/components/ui/Toast'
import { useGeolocation } from '@/hooks/useGeolocation'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, Package, Download, Camera, CheckCircle2, Navigation, X } from 'lucide-react'

const VALID_TRANSITIONS = {
  'Created': ['Picked Up'],
  'Picked Up': ['At Sorting Facility'],
  'At Sorting Facility': ['In Transit'],
  'In Transit': ['Out for Delivery'],
  'Out for Delivery': ['Delivered', 'Failed'],
  'Failed': ['Retry', 'Returned'],
  'Retry': ['In Transit'],
}

export default function AGShipmentDetailPage({ params }) {
  const { id } = use(params)
  const toast = useToast()
  const { location } = useGeolocation()

  const [shipment, setShipment] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [note, setNote] = useState('')

  // Proof of delivery upload
  const [proofFile, setProofFile] = useState(null)
  const [proofNote, setProofNote] = useState('')
  const [uploadingProof, setUploadingProof] = useState(false)

  async function fetchAll() {
    const [sr, er] = await Promise.all([
      fetch(`/api/ag/shipments/${id}`),
      fetch(`/api/track/TRK-temp/history`).catch(() => ({ json: () => ({ events: [] }) })),
    ])
    const sd = await sr.json()
    setShipment(sd.shipment)

    // Fetch events using shipment trackingId
    if (sd.shipment?.trackingId) {
      const er2 = await fetch(`/api/track/${sd.shipment.trackingId}/history`)
      const ed = await er2.json()
      setEvents(ed.events || [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [id])

  async function handleStatusUpdate() {
    if (!selectedStatus) { toast.error('Select a status'); return }
    setUpdating(true)
    try {
      const res = await fetch(`/api/ag/shipments/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus, note, location }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Failed'); return }
      toast.success(`Status updated: ${selectedStatus}`)
      setShowStatusModal(false)
      setNote('')
      setSelectedStatus('')
      await fetchAll()
    } finally { setUpdating(false) }
  }

  async function handleProofUpload(e) {
    e.preventDefault()
    if (!proofFile) { toast.error('Select an image file'); return }
    setUploadingProof(true)
    try {
      const formData = new FormData()
      formData.append('file', proofFile)
      formData.append('note', proofNote)
      const res = await fetch(`/api/ag/shipments/${id}/proof`, { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Upload failed'); return }
      toast.success('Proof of delivery uploaded!')
      setProofFile(null)
      setProofNote('')
      fetchAll()
    } finally { setUploadingProof(false) }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
  if (!shipment) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--danger)' }}>Shipment not found</div>

  const allowedNext = VALID_TRANSITIONS[shipment.currentStatus] || []
  const isTerminal = ['Delivered', 'Returned'].includes(shipment.currentStatus)

  return (
    <div>
      {/* Back */}
      <Link href="/ag/shipments" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Back to shipments
      </Link>

      {/* Header card */}
      <div className="card card-elevated" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <code style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--accent-primary)' }}>{shipment.trackingId}</code>
          <StatusBadge status={shipment.currentStatus} />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Download size={14} /> Deliver to
            </div>
            <div style={{ fontWeight: 700 }}>{shipment.receiver?.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{shipment.receiver?.phone}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              {shipment.receiver?.address}, {shipment.receiver?.city}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Package size={14} /> Package
            </div>
            <div style={{ fontWeight: 600 }}>{shipment.weight} kg</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{shipment.description || '—'}</div>
          </div>
        </div>

        {!isTerminal && allowedNext.length > 0 && (
          <button
            id="ag-update-status-btn"
            className="btn btn-primary w-full"
            onClick={() => setShowStatusModal(true)}
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
          >
            Update Status <ArrowRight size={16} />
          </button>
        )}
      </div>

      {shipment.qrCodeUrl && (
        <div className="card card-elevated" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' }}>Customer QR Code</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.875rem', textAlign: 'center' }}>
            Let the customer scan this code to open live tracking directly.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <a href={`/track?trackingId=${encodeURIComponent(shipment.trackingId)}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block' }}>
              <img
                src={shipment.qrCodeUrl}
                alt={`QR code for ${shipment.trackingId}`}
                style={{ width: 220, maxWidth: '100%', borderRadius: 10, border: '1px solid var(--border)' }}
              />
            </a>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center' }}>
            <a href={`/track?trackingId=${encodeURIComponent(shipment.trackingId)}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
              Open Public Tracking Link
            </a>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="card card-elevated" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '1rem' }}>Tracking History</h3>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem', fontSize: '0.875rem' }}>No events yet</div>
        ) : (
          <Timeline events={events} />
        )}
      </div>

      {/* Proof of delivery upload (if delivered) */}
      {shipment.currentStatus === 'Delivered' && !shipment.proofOfDelivery?.url && (
        <div className="card card-elevated" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '1rem' }}>Upload Proof of Delivery</h3>
          <form onSubmit={handleProofUpload} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div className="form-group">
              <label className="form-label">Photo *</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="form-input"
                onChange={(e) => setProofFile(e.target.files[0] || null)}
                id="proof-file-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Note</label>
              <input className="form-input" value={proofNote} onChange={(e) => setProofNote(e.target.value)} placeholder="Left at door, received by..." />
            </div>
            <button type="submit" className="btn btn-accent w-full" disabled={uploadingProof} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
              {uploadingProof ? <><span className="spinner" /> Uploading...</> : <><Camera size={16} /> Upload Proof</>}
            </button>
          </form>
        </div>
      )}

      {shipment.currentStatus === 'Delivered' && shipment.proofOfDelivery?.url && (
        <div className="card card-elevated" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={20} className="text-success" style={{ color: 'var(--success)' }} /> Proof of Delivery
          </h3>
          <a href={shipment.proofOfDelivery.url} target="_blank" rel="noreferrer">
            <img src={shipment.proofOfDelivery.url} alt="Proof" style={{ width: '100%', maxWidth: 320, borderRadius: 8 }} />
          </a>
          {shipment.proofOfDelivery.note && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>{shipment.proofOfDelivery.note}</p>}
        </div>
      )}

      {/* Status update modal */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowStatusModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Update Status</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowStatusModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Current: <StatusBadge status={shipment.currentStatus} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">New Status *</label>
                <select className="form-select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} id="ag-new-status-select">
                  <option value="">— Select —</option>
                  {allowedNext.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Note</label>
                <textarea className="form-textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note about this update..." rows={3} />
              </div>
              {location && (
                <div style={{ fontSize: '0.78rem', color: 'var(--accent)', background: 'rgba(16,185,129,0.1)', borderRadius: 8, padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Navigation size={14} /> GPS included: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowStatusModal(false)}>Cancel</button>
              <button id="ag-confirm-status-btn" className="btn btn-primary" onClick={handleStatusUpdate} disabled={updating}>
                {updating ? <><span className="spinner" /> Updating...</> : 'Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
