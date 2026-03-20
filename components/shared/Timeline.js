import StatusBadge from './StatusBadge'
import { Package, Upload, Building2, Truck, Navigation, Check, X, RefreshCw, CornerUpLeft, ClipboardList } from 'lucide-react'

const ICON_SIZE = 16

const TIMELINE_ICONS = {
  'Created': <Package size={ICON_SIZE} />,
  'Picked Up': <Upload size={ICON_SIZE} />,
  'At Sorting Facility': <Building2 size={ICON_SIZE} />,
  'In Transit': <Truck size={ICON_SIZE} />,
  'Out for Delivery': <Navigation size={ICON_SIZE} />,
  'Delivered': <Check size={ICON_SIZE} />,
  'Failed': <X size={ICON_SIZE} />,
  'Retry': <RefreshCw size={ICON_SIZE} />,
  'Returned': <CornerUpLeft size={ICON_SIZE} />,
}

export default function Timeline({ events }) {
  if (!events || events.length === 0) {
    return <div className="empty-state"><div className="empty-icon"><ClipboardList size={32} /></div>No events yet</div>
  }

  return (
    <div className="timeline">
      {events.map((ev, i) => {
        const isLast = i === events.length - 1
        
        let dotStyle = {}
        if (isLast) {
           dotStyle = { background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', color: '#fff' }
           if (ev.status === 'Delivered') {
              dotStyle = { background: 'var(--success)', borderColor: 'var(--success)', color: '#fff' }
           } else if (ev.status === 'Failed' || ev.status === 'Returned') {
              dotStyle = { background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff' }
           }
        } else {
           dotStyle = { background: 'rgba(16,185,129,0.1)', borderColor: 'var(--success)', color: 'var(--success)' } 
        }

        return (
          <div key={ev._id || i} className="timeline-item">
            <div className={`timeline-dot ${isLast && !['Delivered', 'Failed', 'Returned'].includes(ev.status) ? 'pulsing-dot' : ''}`} style={dotStyle}>
              {TIMELINE_ICONS[ev.status] || '●'}
            </div>
            <div className="timeline-content">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <StatusBadge status={ev.status} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {new Date(ev.timestamp).toLocaleString()}
                </span>
                {ev.updatedBy?.name && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    by {ev.updatedBy?.name}
                  </span>
                )}
              </div>
              {ev.note && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, marginTop: '0.25rem' }}>{ev.note}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
