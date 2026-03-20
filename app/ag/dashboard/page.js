'use client'

import { Truck, Package, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/shared/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { useGeolocation } from '@/hooks/useGeolocation'

export default function AGDashboard() {
  const { user } = useAuth()
  const { location, error: geoError, getLocation } = useGeolocation()
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ag/shipments')
      .then((r) => r.json())
      .then((d) => { setShipments(d.shipments || []); setLoading(false) })
  }, [])

  // Push location every 30s
  useEffect(() => {
    if (!location) return
    fetch('/api/ag/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(location),
    })
  }, [location])

  useEffect(() => {
    if (!location) return
    const interval = setInterval(getLocation, 30000)
    return () => clearInterval(interval)
  }, [location, getLocation])

  const active = shipments.filter((s) => !['Delivered', 'Failed', 'Returned'].includes(s.currentStatus))
  const completed = shipments.filter((s) => ['Delivered', 'Returned'].includes(s.currentStatus))

  return (
    <div>
      {/* Welcome */}
      <div style={{
        background: 'linear-gradient(135deg, var(--accent-primary) 0%, #F59E0B 100%)',
        borderRadius: 16,
        padding: '1.25rem',
        marginBottom: '1.25rem',
        color: '#fff',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
      }}>
        <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.25rem' }}>Welcome back,</div>
        <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{user?.name || 'Agent'}</div>
        <div style={{ fontSize: '0.8rem', opacity: 0.75, marginTop: '0.25rem' }}>
          {geoError ? (
            <span style={{ color: '#FCA5A5' }}>⚠ GPS: {geoError}</span>
          ) : location ? (
            `📍 GPS active — ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
          ) : (
            '📍 Getting location...'
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        {[
          { label: 'Active',    value: active.length,     color: 'var(--accent-primary)', icon: <Truck size={16} /> },
          { label: 'Today',     value: shipments.length,  color: 'var(--warning)', icon: <Package size={16} /> },
          { label: 'Completed', value: completed.length,  color: 'var(--success)',  icon: <CheckCircle2 size={16} /> },
        ].map((s) => (
          <div key={s.label} className="stat-card card-elevated" style={{ padding: '0.75rem', borderRadius: 12 }}>
            <div className="stat-label" style={{ fontSize: '0.7rem' }}>{s.label}</div>
            <div className="stat-value" style={{ color: s.color, marginTop: '0.25rem', fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Active shipments */}
      <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '0.75rem' }}>Active Shipments</h3>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>
      ) : active.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📦</div>No active shipments</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {active.map((s) => (
            <Link key={s._id} href={`/ag/shipments/${s._id}`}
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
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📍 {s.receiver?.address}, {s.receiver?.city}</div>
              {s.assignedHub && (
                <div style={{ fontSize: '0.775rem', color: 'var(--text-dim)', marginTop: '0.375rem' }}>
                  Hub: {s.assignedHub.name}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
