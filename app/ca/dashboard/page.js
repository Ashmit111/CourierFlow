'use client'

import { useState, useEffect, useRef } from 'react'
import { Package, CheckCircle2, Clock, Bike, XCircle, Users } from 'lucide-react'
import Link from 'next/link'
import StatusBadge from '@/components/shared/StatusBadge'
import MetricCard from '@/components/shared/MetricCard'
import { usePusher } from '@/hooks/usePusher'
import { useAuth } from '@/hooks/useAuth'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import dynamic from 'next/dynamic'

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

// Leaflet map — dynamic import to avoid SSR issues
const AgentMap = dynamic(() => import('@/components/map/AgentMap'), { ssr: false })

export default function CADashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [agents, setAgents] = useState([])
  const [agentLocations, setAgentLocations] = useState({})
  const [recentShipments, setRecentShipments] = useState([])
  const [loading, setLoading] = useState(true)

  const tenantId = user?.tenant_id?._id || user?.tenant_id

  useEffect(() => {
    Promise.all([
      fetch('/api/ca/analytics').then((r) => r.json()),
      fetch('/api/ca/agents').then((r) => r.json()),
      fetch('/api/ca/shipments?page=1').then((r) => r.json()),
    ]).then(([a, ag, sh]) => {
      setStats(a)
      const agArr = ag.agents || []
      setAgents(agArr)
      const locs = {}
      agArr.forEach((agent) => {
        if (agent.currentLocation?.lat) {
          locs[agent._id] = { ...agent.currentLocation, name: agent.user_id?.name }
        }
      })
      setAgentLocations(locs)
      setRecentShipments((sh.shipments || []).slice(0, 5))
      setLoading(false)
    })
  }, [])

  // Real-time agent location updates via Pusher
  usePusher(tenantId ? `agent-location-${tenantId}` : null, 'location-update', (data) => {
    setAgentLocations((prev) => ({
      ...prev,
      [data.agentId]: { lat: data.lat, lng: data.lng, updatedAt: data.updatedAt },
    }))
  })

  const statCards = stats
    ? [
        { label: 'Total Shipments',   value: stats.counts?.total || 0,           icon: <Package size={24} />, color: 'var(--primary)' },
        { label: 'Delivered',          value: stats.counts?.delivered || 0,       icon: <CheckCircle2 size={24} />,  color: 'var(--success)' },
        { label: 'Pending',            value: stats.counts?.pending || 0,         icon: <Clock size={24} />, color: 'var(--warning)' },
        { label: 'Out for Delivery',   value: stats.counts?.outForDelivery || 0, icon: <Bike size={24} />, color: 'var(--accent-primary)' },
        { label: 'Failed',             value: stats.counts?.failed || 0,          icon: <XCircle size={24} />,  color: 'var(--danger)' },
        { label: 'Active Agents',      value: agents.filter((a) => a.isAvailable).length, icon: <Users size={24} />, color: 'var(--success)' },
      ]
    : []

  const pieData = stats?.statusBreakdown?.map((s) => ({
    name: s._id,
    value: s.count,
    color: STATUS_COLORS[s._id] || '#64748B',
  })) || []

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Dashboard</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Overview of your logistics operations</p>
      </div>

      {/* Stat Cards */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="stat-card" style={{ opacity: 0.4 }}>
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

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        {/* Pie Chart */}
        <div className="card card-elevated">
          <div className="card-header">
            <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Shipments by Status</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {pieData.length > 0 ? (
              <>
                <div style={{ width: 160, height: 160, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70}>
                        {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1 }}>
                  {pieData.map((d) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flex: 1 }}>{d.name}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state" style={{ flex: 1 }}><div className="empty-icon">📊</div>No data yet</div>
            )}
          </div>
        </div>

        {/* Recent Shipments */}
        <div className="card card-elevated">
          <div className="card-header">
            <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Recent Shipments</h3>
            <Link href="/ca/shipments" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <div style={{ overflow: 'hidden' }}>
            {recentShipments.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📦</div>No shipments yet</div>
            ) : recentShipments.map((s) => (
              <Link key={s._id} href={`/ca/shipments/${s._id}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: 2 }}>{s.trackingId}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.sender?.city} → {s.receiver?.city}
                  </div>
                </div>
                <StatusBadge status={s.currentStatus} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Map */}
      <div className="card card-elevated">
        <div className="card-header">
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            Live Agent Locations
            <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400, fontFamily: 'var(--font-mono)' }}>
              Updates in real-time via Pusher
            </span>
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
            <span style={{ color: 'var(--text-muted)' }}>{Object.keys(agentLocations).length} agents reporting</span>
          </div>
        </div>
        <div style={{ height: 360 }}>
          <AgentMap locations={Object.values(agentLocations)} />
        </div>
      </div>
    </div>
  )
}
