'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/shared/StatusBadge'

export default function AGShipmentsPage() {
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    const params = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''
    fetch(`/api/ag/shipments${params}`)
      .then((r) => r.json())
      .then((d) => { setShipments(d.shipments || []); setLoading(false) })
  }, [statusFilter])

  const STATUSES = [
    '',
    'Created', 'Picked Up', 'At Sorting Facility', 'In Transit',
    'Out for Delivery', 'Delivered', 'Failed', 'Retry', 'Returned',
  ]

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '0.875rem' }}>My Shipments</h2>
        <div style={{ overflowX: 'auto', display: 'flex', gap: '0.5rem', paddingBottom: '0.25rem' }}>
          {['', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setLoading(true) }}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>
      ) : shipments.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📦</div>No shipments found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {shipments.map((s) => (
            <Link
              key={s._id}
              href={`/ag/shipments/${s._id}`}
              className="card card-elevated"
              style={{
                display: 'block',
                padding: '1rem',
                textDecoration: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <code style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{s.trackingId}</code>
                <StatusBadge status={s.currentStatus} />
              </div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{s.receiver?.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.receiver?.address}, {s.receiver?.city}</div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-dim)', marginTop: '0.375rem' }}>
                {s.weight} kg · {s.description || 'No description'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
