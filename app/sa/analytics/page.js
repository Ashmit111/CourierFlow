'use client'

import { Building2, CheckCircle2, ShieldCheck, Package, Users, CalendarDays } from 'lucide-react'
import { useState, useEffect } from 'react'
import MetricCard from '@/components/shared/MetricCard'

export default function SAAnalyticsPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sa/analytics').then((r) => r.json()).then((d) => { setStats(d); setLoading(false) })
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading analytics...</div>

  const statCards = [
    { label: 'Total Tenants',    value: stats.totalTenants,    icon: <Building2 size={24} />, color: 'var(--primary)' },
    { label: 'Active',           value: stats.activeTenants,   icon: <CheckCircle2 size={24} />,  color: 'var(--success)' },
    { label: 'Suspended',        value: stats.suspendedTenants, icon: <ShieldCheck size={24} />, color: 'var(--danger)' },
    { label: 'Platform Shipments', value: stats.totalShipments, icon: <Package size={24} />, color: 'var(--warning)' },
    { label: 'Total Users',      value: stats.totalUsers,      icon: <Users size={24} />, color: 'var(--accent-secondary)' },
    { label: 'New Tenants (30d)', value: stats.recentTenants,  icon: <CalendarDays size={24} />, color: 'var(--success)' },
  ]

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '1.5rem' }}>Platform Analytics</h2>

      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        {statCards.map((s) => (
          <MetricCard
            key={s.label}
            label={s.label}
            value={s.value ?? 0}
            icon={s.icon}
            color={s.color}
          />
        ))}
      </div>

      <div className="card card-elevated">
        <div className="card-header">
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Shipments by Status (Platform-wide)</h3>
        </div>
        <div className="card-body">
          {stats.shipmentsByStatus?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stats.shipmentsByStatus.map((s) => (
                <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ minWidth: 160, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{s._id}</span>
                  <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        background: 'var(--primary)',
                        borderRadius: 4,
                        width: `${Math.min(100, Math.round((s.count / (stats.totalShipments || 1)) * 100))}%`,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                  <span style={{ minWidth: 50, textAlign: 'right', fontWeight: 700, fontSize: '0.875rem' }}>
                    {s.count} ({Math.round((s.count / (stats.totalShipments || 1)) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state"><div className="empty-icon">📊</div>No shipment data yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
