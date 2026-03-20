'use client'

import { Building2, CheckCircle2, Ban, Users, Package, KeySquare, CalendarDays } from 'lucide-react'

// You might need to add other imports as they were before
import { useState, useEffect } from 'react'
import Link from 'next/link'
import MetricCard from '@/components/shared/MetricCard'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const STATUS_COLORS = {
  'Delivered': '#10B981',
  'In Transit': '#6366F1',
  'Out for Delivery': '#F59E0B',
  'Created': '#64748B',
  'Picked Up': '#8B5CF6',
  'At Sorting Facility': '#A855F7',
  'Failed': '#EF4444',
  'Returned': '#F43F5E',
}

export default function SADashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sa/analytics')
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const statCards = stats
    ? [
        { label: 'Total Tenants',    value: stats.totalTenants,    icon: <Building2 size={24} />, color: 'var(--primary)' },
        { label: 'Active Tenants',   value: stats.activeTenants,   icon: <CheckCircle2 size={24} />,  color: 'var(--success)' },
        { label: 'Suspended',        value: stats.suspendedTenants, icon: <Ban size={24} />, color: 'var(--danger)' },
        { label: 'Platform Users',   value: stats.totalUsers,      icon: <Users size={24} />, color: 'var(--accent-secondary)' },
        { label: 'Total Shipments',  value: stats.totalShipments,  icon: <Package size={24} />, color: 'var(--warning)' },
        { label: 'New (30d)',        value: stats.recentTenants,   icon: <CalendarDays size={24} />, color: 'var(--success)' },
      ]
    : []

  const pieData = stats?.shipmentsByStatus?.map((s) => ({
    name: s._id,
    value: s.count,
    color: STATUS_COLORS[s._id] || '#64748B',
  })) || []

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Platform Overview</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Monitor all tenants and platform activity
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="stat-card" style={{ opacity: 0.5 }}>
                <div style={{ height: 16, background: 'var(--border)', borderRadius: 4, width: '40%', marginBottom: 16 }} />
                <div style={{ height: 32, background: 'var(--border)', borderRadius: 4, width: '30%' }} />
              </div>
            ))
          : statCards.map((s) => (
              <MetricCard 
                key={s.label}
                label={s.label}
                value={s.value ?? 0}
                icon={s.icon}
                color={s.color}
              />
            ))}
      </div>

      {/* Shipments by Status Diagram */}
      <div className="card card-elevated" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Shipments by Status</h3>
        </div>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          {!loading && pieData.length > 0 ? (
            <>
              <div style={{ width: 220, height: 220, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={65} outerRadius={100}>
                      {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Tracked Shipments</span>
                    <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                      {stats.totalShipments}
                    </span>
                  </div>
                  <Package size={40} className="text-primary" style={{ opacity: 0.8 }} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {pieData.map((d) => {
                    const percentage = stats.totalShipments > 0 ? Math.round((d.value / stats.totalShipments) * 100) : 0;
                    return (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: 14, height: 14, borderRadius: 4, background: d.color, flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{d.name}</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{d.value}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-dim)' }}>
                          {percentage}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ flex: 1, padding: '2rem' }}>
              <div className="empty-icon">📊</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No shipment data yet</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
