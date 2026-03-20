'use client'

import { useState, useEffect } from 'react'
import DataTable from '@/components/shared/DataTable'

export default function SAAuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ action: '', from: '', to: '' })

  async function fetchLogs(p = page, f = filters) {
    setLoading(true)
    const params = new URLSearchParams({ page: p })
    if (f.action) params.set('action', f.action)
    if (f.from) params.set('from', f.from)
    if (f.to) params.set('to', f.to)
    const res = await fetch(`/api/sa/audit-logs?${params}`)
    const data = await res.json()
    setLogs(data.logs || [])
    setTotal(data.total || 0)
    setPage(p)
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [])

  const actionColors = {
    CREATE: 'badge-green',
    UPDATE: 'badge-blue',
    DELETE: 'badge-red',
    LOGIN: 'badge-gray',
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Audit Logs</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{total} total entries</p>
      </div>

      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        <select
          className="form-select"
          style={{ maxWidth: 160 }}
          value={filters.action}
          onChange={(e) => { const f = { ...filters, action: e.target.value }; setFilters(f); fetchLogs(1, f) }}
          id="audit-action-filter"
        >
          <option value="">All Actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
        <input
          type="date"
          className="form-input"
          style={{ maxWidth: 180 }}
          value={filters.from}
          onChange={(e) => { const f = { ...filters, from: e.target.value }; setFilters(f); fetchLogs(1, f) }}
          id="audit-from-date"
        />
        <input
          type="date"
          className="form-input"
          style={{ maxWidth: 180 }}
          value={filters.to}
          onChange={(e) => { const f = { ...filters, to: e.target.value }; setFilters(f); fetchLogs(1, f) }}
          id="audit-to-date"
        />
      </div>

      <DataTable
        columns={['Actor', 'Tenant', 'Action', 'Entity', 'Timestamp']}
        data={loading ? [] : logs}
        emptyText={loading ? "Loading..." : "No audit logs"}
        emptyIcon="📝"
        renderRow={(log) => (
          <>
            <td>
              <div style={{ fontWeight: 600 }}>{log.actor_id?.name || 'Unknown'}</div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{log.actor_id?.role}</div>
            </td>
            <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{log.tenant_id?.name || '—'}</td>
            <td><span className={`badge ${actionColors[log.action] || 'badge-gray'}`}>{log.action}</span></td>
            <td>
              <span style={{ fontSize: '0.85rem' }}>{log.entity}</span>
              {log.entity_id && <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{String(log.entity_id).slice(-8)}</div>}
            </td>
            <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textAlign: 'right' }}>
              {new Date(log.timestamp).toLocaleString()}
            </td>
          </>
        )}
      />

      {/* Pagination */}
      <div className="pagination" style={{ marginTop: '1rem' }}>
        <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => fetchLogs(page - 1)}>← Prev</button>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '0 0.5rem' }}>Page {page}</span>
        <button className="btn btn-outline btn-sm" disabled={logs.length < 50} onClick={() => fetchLogs(page + 1)}>Next →</button>
      </div>
    </div>
  )
}
