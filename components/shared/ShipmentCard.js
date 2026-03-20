import Link from 'next/link'
import StatusBadge from './StatusBadge'

const STATUS_COLORS = {
  'Created': 'var(--text-muted)',
  'Picked Up': 'var(--accent-secondary)',
  'At Sorting Facility': '#C084FC',
  'In Transit': 'var(--accent-secondary)',
  'Out for Delivery': 'var(--warning)',
  'Delivered': 'var(--success)',
  'Failed': 'var(--danger)',
  'Returned': 'var(--danger)',
  'Retry': 'var(--warning)'
}

export default function ShipmentCard({ shipment, href }) {
  const borderColor = STATUS_COLORS[shipment.currentStatus] || 'var(--border)'

  return (
    <Link href={href} className="shipment-card" style={{ borderLeftColor: borderColor }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <code className="tracking-id">{shipment.trackingId}</code>
        <StatusBadge status={shipment.currentStatus} />
      </div>
      <div className="shipment-card-title">{shipment.receiver?.name || 'Unknown'}</div>
      <div className="shipment-card-route">
        <span>{shipment.sender?.city || 'Origin'}</span>
        <span style={{ color: 'var(--text-dim)', margin: '0 0.5rem' }}>→</span>
        <span>{shipment.receiver?.city || 'Destination'}</span>
      </div>
      <div className="shipment-card-meta">
        {shipment.weight} kg {shipment.description ? `· ${shipment.description}` : ''}
        {shipment.assignedHub && ` · ${shipment.assignedHub.name}`}
      </div>
    </Link>
  )
}
