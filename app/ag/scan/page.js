'use client'

import Link from 'next/link'

export default function AGScanPage() {
  return (
    <div
      className="card card-elevated"
      style={{
        padding: '1rem',
      }}
    >
      <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '0.5rem' }}>Scan Removed for Agents</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
        You already have assigned shipment details in your list. Open a shipment directly to view its QR code for customers.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link href="/ag/shipments" className="btn btn-primary">
          Go to My Shipments
        </Link>
        <Link href="/track" className="btn btn-outline">
          Open Public Track Page
        </Link>
      </div>
    </div>
  )
}
