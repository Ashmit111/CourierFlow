export default function QRCard({ trackingId, qrCodeUrl, showLink = true }) {
  if (!qrCodeUrl) return null

  return (
    <div className="card" style={{ background: 'var(--surface-elevated)' }}>
      <div className="card-header"><h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Customer QR Code</h3></div>
      <div className="card-body" style={{ textAlign: 'center' }}>
        <a href={`/track?trackingId=${encodeURIComponent(trackingId)}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block' }}>
          <img
            src={qrCodeUrl}
            alt={`QR code for ${trackingId}`}
            style={{ width: 220, maxWidth: '100%', borderRadius: 10, border: '1px solid var(--border)' }}
          />
        </a>
        <div style={{ marginTop: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
          {trackingId}
        </div>
        {showLink && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
             <a href={qrCodeUrl} download={`QR-${trackingId}.png`} target="_blank" rel="noreferrer" className="btn btn-accent btn-sm">
                Download QR
             </a>
             <a href={`/track?trackingId=${encodeURIComponent(trackingId)}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                Open Link
             </a>
          </div>
        )}
      </div>
    </div>
  )
}
