'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/shared/StatusBadge'
import DataTable from '@/components/shared/DataTable'
import ConfirmModal from '@/components/shared/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { Eye, Edit2, Trash2 } from 'lucide-react'

const PAGE_SIZE = 20

export default function CAShipmentsPage() {
  const toast = useToast()
  const [allShipments, setAllShipments] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [hubs, setHubs] = useState([])
  const [agents, setAgents] = useState([])
  const [filters, setFilters] = useState({ status: '', hub: '', agent: '', search: '' })
  const [confirmDelete, setConfirmDelete] = useState(null)

  async function fetchShipments() {
    setLoading(true)

    const firstRes = await fetch('/api/ca/shipments?page=1')
    const firstData = await firstRes.json()

    let combined = firstData.shipments || []
    const totalPages = firstData.pages || 1

    if (totalPages > 1) {
      const remaining = []
      for (let p = 2; p <= totalPages; p++) {
        remaining.push(fetch(`/api/ca/shipments?page=${p}`).then((r) => r.json()))
      }
      const rest = await Promise.all(remaining)
      for (const pageData of rest) {
        combined = combined.concat(pageData.shipments || [])
      }
    }

    setAllShipments(combined)
    setLoading(false)
  }

  useEffect(() => {
    fetchShipments()
    Promise.all([
      fetch('/api/ca/hubs').then((r) => r.json()),
      fetch('/api/ca/agents').then((r) => r.json()),
    ]).then(([hd, ad]) => {
      setHubs(hd.hubs || [])
      setAgents(ad.agents || [])
    })
  }, [])

  const filteredShipments = useMemo(() => {
    const search = filters.search.trim().toLowerCase()

    return allShipments.filter((s) => {
      if (filters.status && s.currentStatus !== filters.status) return false
      if (filters.hub && String(s.assignedHub?._id || '') !== String(filters.hub)) return false
      if (filters.agent && String(s.assignedAgent?._id || '') !== String(filters.agent)) return false

      if (search) {
        const haystack = [
          s.trackingId,
          s.sender?.name,
          s.sender?.city,
          s.receiver?.name,
          s.receiver?.city,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(search)) return false
      }

      return true
    })
  }, [allShipments, filters])

  const total = filteredShipments.length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    if (page > pages) setPage(pages)
  }, [page, pages])

  const shipments = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredShipments.slice(start, start + PAGE_SIZE)
  }, [filteredShipments, page])

  function applyFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  function clearFilters() {
    setFilters({ status: '', hub: '', agent: '', search: '' })
    setPage(1)
  }

  const hasActiveFilters = !!(filters.search || filters.status || filters.hub || filters.agent)

  async function handleDeleteConfirm() {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    const res = await fetch(`/api/ca/shipments/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Shipment deleted'); fetchShipments() }
    else toast.error('Failed to delete')
    setConfirmDelete(null);
  }

  const STATUSES = ['Created', 'Picked Up', 'At Sorting Facility', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed', 'Returned']

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Shipments</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{total} total shipments</p>
        </div>
        <Link id="ca-new-shipment-btn" href="/ca/shipments/new" className="btn btn-primary">
          + New Shipment
        </Link>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        <input
          className="form-input"
          style={{ maxWidth: 240 }}
          placeholder="Search tracking ID, name..."
          value={filters.search}
          onChange={(e) => applyFilter('search', e.target.value)}
          id="shipment-search"
        />
        <select className="form-select" style={{ maxWidth: 180 }} value={filters.status} onChange={(e) => applyFilter('status', e.target.value)} id="shipment-status-filter">
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-select" style={{ maxWidth: 160 }} value={filters.hub} onChange={(e) => applyFilter('hub', e.target.value)} id="shipment-hub-filter">
          <option value="">All Hubs</option>
          {hubs.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
        </select>
        <select className="form-select" style={{ maxWidth: 160 }} value={filters.agent} onChange={(e) => applyFilter('agent', e.target.value)} id="shipment-agent-filter">
          <option value="">All Agents</option>
          {agents.map((a) => <option key={a._id} value={a._id}>{a.user_id?.name}</option>)}
        </select>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
          id="shipment-clear-filters"
        >
          Clear Filters
        </button>
      </div>

      <DataTable
        columns={['Tracking ID', 'Sender', 'Receiver', 'Hub', 'Agent', 'Status', 'Created', 'Actions']}
        data={loading ? [] : shipments}
        emptyText={loading ? "Loading..." : "No shipments found"}
        emptyIcon="📦"
        renderRow={(s) => (
          <>
            <td>
              <Link href={`/ca/shipments/${s._id}`} style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                {s.trackingId}
              </Link>
            </td>
            <td style={{ fontSize: '0.85rem' }}>{s.sender?.name}<br /><span style={{ color: 'var(--text-muted)' }}>{s.sender?.city}</span></td>
            <td style={{ fontSize: '0.85rem' }}>{s.receiver?.name}<br /><span style={{ color: 'var(--text-muted)' }}>{s.receiver?.city}</span></td>
            <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.assignedHub?.name || '—'}</td>
            <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.assignedAgent?.user_id?.name || '—'}</td>
            <td><StatusBadge status={s.currentStatus} /></td>
            <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                <Link href={`/ca/shipments/${s._id}`} className="btn btn-ghost btn-sm btn-icon" title="View">
                  <Eye size={18} />
                </Link>
                {s.currentStatus !== 'Delivered' && (
                  <Link href={`/ca/shipments/${s._id}/edit`} className="btn btn-ghost btn-sm btn-icon" title="Edit">
                    <Edit2 size={18} />
                  </Link>
                )}
                <button className="btn btn-ghost btn-sm btn-icon text-danger" onClick={() => setConfirmDelete({ id: s._id, trackingId: s.trackingId })} title="Delete">
                  <Trash2 size={18} />
                </button>
              </div>
            </td>
          </>
        )}
      />

      {pages > 1 && (
        <div className="pagination" style={{ marginTop: '1rem' }}>
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</button>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '0 0.5rem' }}>Page {page} of {pages}</span>
          <button className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next →</button>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Shipment"
        message={`Are you sure you want to delete shipment ${confirmDelete?.trackingId}? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  )
}
