'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/shared/StatusBadge'
import DataTable from '@/components/shared/DataTable'
import { User, Package, CheckCircle2, AlertCircle } from 'lucide-react'

export default function AgentShipmentsPage({ params }) {
  const { id } = use(params)

  const [loading, setLoading] = useState(true)
  const [agent, setAgent] = useState(null)
  const [summary, setSummary] = useState({ totalAssigned: 0, delivered: 0, notDelivered: 0 })
  const [shipments, setShipments] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchAgentShipments() {
      try {
        const res = await fetch(`/api/ca/agents/${id}/shipments`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Failed to fetch agent data')
          return
        }

        setAgent(data.agent)
        setSummary(data.summary || { totalAssigned: 0, delivered: 0, notDelivered: 0 })
        setShipments(data.shipments || [])
      } catch {
        setError('Failed to fetch agent data')
      } finally {
        setLoading(false)
      }
    }

    fetchAgentShipments()
  }, [id])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--danger)' }}>{error}</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <User size={18} className="text-primary" />
            <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{agent?.user_id?.name || 'Agent'}</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{agent?.user_id?.email}</p>
        </div>
        <Link href="/ca/agents" className="btn btn-outline btn-sm">Back to Agents</Link>
      </div>

      <div className="grid-3" style={{ gap: '0.75rem' }}>
        <div className="card card-elevated">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Assigned</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>{summary.totalAssigned}</div>
            </div>
            <Package size={20} className="text-primary" />
          </div>
        </div>

        <div className="card card-elevated">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Delivered</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--success)' }}>{summary.delivered}</div>
            </div>
            <CheckCircle2 size={20} className="text-success" />
          </div>
        </div>

        <div className="card card-elevated">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Not Delivered</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--warning)' }}>{summary.notDelivered}</div>
            </div>
            <AlertCircle size={20} className="text-warning" />
          </div>
        </div>
      </div>

      <DataTable
        columns={['Tracking ID', 'Receiver', 'Hub', 'Status', 'Created']}
        data={shipments}
        emptyText="No shipments assigned to this agent"
        emptyIcon="📦"
        renderRow={(s) => (
          <>
            <td>
              <Link href={`/ca/shipments/${s._id}`} style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem' }}>
                {s.trackingId}
              </Link>
            </td>
            <td style={{ fontSize: '0.85rem' }}>
              {s.receiver?.name}
              <br />
              <span style={{ color: 'var(--text-muted)' }}>{s.receiver?.city}</span>
            </td>
            <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{s.assignedHub?.name || '—'}</td>
            <td><StatusBadge status={s.currentStatus} /></td>
            <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
          </>
        )}
      />
    </div>
  )
}
