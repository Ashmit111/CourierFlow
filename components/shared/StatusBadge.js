'use client'

import { Package, Upload, Building2, Truck, Navigation, Check, X, RefreshCw, CornerUpLeft } from 'lucide-react'

const ICON_SIZE = 12

const STATUS_ICONS = {
  'Created':             <Package size={ICON_SIZE} />,
  'Picked Up':           <Upload size={ICON_SIZE} />,
  'At Sorting Facility': <Building2 size={ICON_SIZE} />,
  'In Transit':          <Truck size={ICON_SIZE} />,
  'Out for Delivery':    <Navigation size={ICON_SIZE} />,
  'Delivered':           <Check size={ICON_SIZE} />,
  'Failed':              <X size={ICON_SIZE} />,
  'Retry':               <RefreshCw size={ICON_SIZE} />,
  'Returned':            <CornerUpLeft size={ICON_SIZE} />,
  'active':              '●',
  'suspended':           '●',
  'Available':           '●',
  'Unavailable':         '●',
}

const STATUS_CONFIG = {
  'Created':             { cls: 'badge-created' },
  'Picked Up':           { cls: 'badge-pickedup' },
  'At Sorting Facility': { cls: 'badge-sorting' },
  'In Transit':          { cls: 'badge-transit' },
  'Out for Delivery':    { cls: 'badge-out' },
  'Delivered':           { cls: 'badge-delivered' },
  'Failed':              { cls: 'badge-failed' },
  'Retry':               { cls: 'badge-retry' },
  'Returned':            { cls: 'badge-returned' },
  'active':              { cls: 'badge-delivered' },
  'suspended':           { cls: 'badge-failed' },
  'Available':           { cls: 'badge-delivered' },
  'Unavailable':         { cls: 'badge-created' },
}

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { cls: 'badge-created' }
  const icon = STATUS_ICONS[status] || '●'
  
  return (
    <span className={`badge ${config.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <span>{typeof status === 'string' ? status.toUpperCase() : status}</span>
    </span>
  )
}
