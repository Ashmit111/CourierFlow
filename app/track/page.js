'use client'

import { Suspense } from "react"
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Scan as ScanIcon, Calendar, Store, Navigation, Camera, ClipboardList } from 'lucide-react'
import StatusBadge from '@/components/shared/StatusBadge'
import Timeline from '@/components/shared/Timeline'
import { usePusher } from '@/hooks/usePusher'
import dynamic from 'next/dynamic'
import jsQR from 'jsqr'

const AgentMap = dynamic(() => import('@/components/map/AgentMap'), { ssr: false })

function TrackComponent() {
  const searchParams = useSearchParams()
  const [trackingId, setTrackingId] = useState('')
  const [result, setResult] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const lastAutoTrackedRef = useRef('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const scanLoopRef = useRef(null)
  const canvasRef = useRef(null)
  const lastDecodeAtRef = useRef(0)

  function stopCamera() {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current)
      scanLoopRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  function parseTrackingIdFromQR(raw) {
    const value = raw.trim()
    const upper = value.toUpperCase()
    if (upper.startsWith('TRK-')) return upper

    try {
      const url = new URL(value)
      const id = (url.searchParams.get('trackingId') || '').trim().toUpperCase()
      if (id.startsWith('TRK-')) return id
    } catch {}

    const match = upper.match(/TRK-[A-Z0-9]+/)
    return match ? match[0] : null
  }

  function handleScan(rawValue) {
    const parsed = parseTrackingIdFromQR(rawValue)
    if (!parsed) {
      setScanError('QR code does not contain a valid tracking ID')
      return
    }

    stopCamera()
    setScanError('')
    setTrackingId(parsed)
    searchByTrackingId(parsed)
  }

  async function startCamera() {
    setScanError('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setScanning(true)

      let detector = null
      if ('BarcodeDetector' in window) {
        try {
          detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        } catch {}
      }

      const detect = async () => {
        if (!streamRef.current) return

        if (!videoRef.current || videoRef.current.readyState < 2) {
          scanLoopRef.current = requestAnimationFrame(detect)
          return
        }

        const now = Date.now()
        if (now - lastDecodeAtRef.current < 220) {
          scanLoopRef.current = requestAnimationFrame(detect)
          return
        }
        lastDecodeAtRef.current = now

        try {
          if (detector) {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) {
              handleScan(barcodes[0].rawValue || '')
              return
            }
          } else {
            const video = videoRef.current
            const canvas = canvasRef.current

            if (video && canvas && video.videoWidth > 0 && video.videoHeight > 0) {
              canvas.width = video.videoWidth
              canvas.height = video.videoHeight

              const ctx = canvas.getContext('2d', { willReadFrequently: true })
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                const qr = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })
                if (qr?.data) {
                  handleScan(qr.data)
                  return
                }
              }
            }
          }
        } catch {}

        scanLoopRef.current = requestAnimationFrame(detect)
      }

      scanLoopRef.current = requestAnimationFrame(detect)
    } catch {
      setScanError('Camera access denied. Please allow permission or enter tracking ID manually.')
      stopCamera()
    }
  }

  useEffect(() => {
    if (!scanning || !videoRef.current || !streamRef.current) return

    const video = videoRef.current
    video.srcObject = streamRef.current
    video.play().catch(() => {
      setScanError('Unable to start camera preview. Please retry scan.')
    })
  }, [scanning])

  async function searchByTrackingId(rawTrackingId) {
    const id = rawTrackingId.trim().toUpperCase()
    if (!id) return

    setLoading(true)
    setError('')
    setResult(null)
    setEvents([])

    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/track/${id}`),
        fetch(`/api/track/${id}/history`),
      ])
      const [d1, d2] = await Promise.all([r1.json(), r2.json()])

      if (!r1.ok) { setError(d1.error || 'Shipment not found'); return }
      setResult(d1)
      setEvents(d2.events || [])
    } catch {
      setError('Failed to fetch tracking info')
    } finally { setLoading(false) }
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!trackingId.trim()) return
    searchByTrackingId(trackingId)
  }

  useEffect(() => {
    const fromQuery = (searchParams.get('trackingId') || '').trim().toUpperCase()
    if (!fromQuery || !fromQuery.startsWith('TRK-')) return
    if (lastAutoTrackedRef.current === fromQuery) return

    lastAutoTrackedRef.current = fromQuery
    setTrackingId(fromQuery)
    searchByTrackingId(fromQuery)
  }, [searchParams])

  useEffect(() => () => stopCamera(), [])

  // Real-time updates
  usePusher(
    result ? `shipment-${result.trackingId}` : null,
    'status-update',
    (data) => {
      setResult((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          currentStatus: data.status,
        }
      })
    }
  )

  usePusher(
    result ? `shipment-${result.trackingId}` : null,
    'location-update',
    (data) => {
      setResult((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          agentLocation: {
            lat: data.lat,
            lng: data.lng,
            updatedAt: data.updatedAt,
          },
        }
      })
    }
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ 
            width: 48, height: 48, background: 'var(--accent-primary)', 
            borderRadius: 12, margin: '0 auto 1.25rem', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', color: '#fff', 
            fontWeight: 800, fontSize: '1.3rem', fontFamily: 'var(--font-display)',
            boxShadow: '0 4px 14px rgba(245,158,11,0.4)'
          }}>
            CF
          </div>
          <h1 style={{ fontSize: '2.25rem', fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '0.5rem' }}>Track your Shipment</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Enter your tracking ID to get real-time updates
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--surface-2)', padding: '0.5rem', borderRadius: '999px', border: '1px solid var(--border)' }}>
          <input
            id="track-input"
            className="form-input"
            style={{ flex: 1, fontSize: '1rem', fontFamily: 'var(--font-mono)', background: 'transparent', border: 'none', boxShadow: 'none', paddingLeft: '1rem', outline: 'none' }}
            placeholder="TRK-XXXXXXXXXX"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            autoFocus
          />
          <button
            id="track-scan-btn"
            type="button"
            className="btn btn-ghost hidden sm:flex"
            onClick={scanning ? stopCamera : startCamera}
            style={{ borderRadius: '999px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ScanIcon size={18} />
            <span className="hidden sm:inline-block">{scanning ? 'Stop' : 'Scan'}</span>
          </button>
          <button id="track-submit-btn" type="submit" className="btn btn-primary" disabled={loading} style={{ borderRadius: '999px', padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {loading ? <span className="spinner" /> : <Search size={18} />}
            <span className="hidden sm:inline-block">Track</span>
          </button>
        </form>

        {scanning && (
          <div className="qr-scanner-wrap" style={{ marginBottom: '1.25rem' }}>
            <video
              ref={videoRef}
              id="track-qr-video"
              style={{ width: '100%', borderRadius: 12, display: 'block', minHeight: 280, objectFit: 'cover', background: '#000' }}
              muted
              playsInline
              autoPlay
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: 200,
                  height: 200,
                  border: '3px solid var(--accent-primary)',
                  borderRadius: 12,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.85)',
                }}
              />
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}

        {scanError && (
          <div
            style={{
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.35)',
              borderRadius: 10,
              padding: '0.75rem 1rem',
              color: 'var(--warning)',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
            }}
          >
            {scanError}
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '1rem', color: 'var(--danger)', textAlign: 'center', marginBottom: '1.5rem',
          }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Status Card */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '1.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <code style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)' }}>{result.trackingId}</code>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    Created {new Date(result.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <StatusBadge status={result.currentStatus} />
              </div>

              <div className="grid-2" style={{ gap: '1rem' }}>
                <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '0.875rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>FROM</div>
                  <div style={{ fontWeight: 600 }}>{result.sender?.city}</div>
                </div>
                <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '0.875rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>TO</div>
                  <div style={{ fontWeight: 600 }}>{result.receiver?.city}</div>
                </div>
              </div>

              {result.estimatedDelivery && (
                <div style={{ marginTop: '0.875rem', padding: '0.75rem 1rem', background: 'var(--primary-light)', borderRadius: 10, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={16} /> Estimated delivery: <strong>{new Date(result.estimatedDelivery).toLocaleDateString()}</strong>
                </div>
              )}

              {result.assignedHub && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Store size={14} /> Current hub: {result.assignedHub.name}, {result.assignedHub.city}
                </div>
              )}
            </div>

            {/* Agent Map */}
            {result.agentLocation?.lat && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Navigation size={16} /> Agent live location
                </div>
                <div style={{ height: 280 }}>
                  <AgentMap singleLocation={result.agentLocation} />
                </div>
              </div>
            )}

            {/* Proof of Delivery */}
            {result.currentStatus === 'Delivered' && result.proofOfDelivery?.url && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem', textAlign: 'center' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Camera size={18} /> Proof of Delivery</h3>
                <a href={result.proofOfDelivery.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block' }}>
                  <img src={result.proofOfDelivery.url} alt="Proof of delivery" style={{ width: '100%', maxWidth: 360, borderRadius: 10, border: '1px solid var(--border)' }} />
                </a>
                {result.proofOfDelivery.note && (
                  <p style={{ marginTop: '0.625rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {result.proofOfDelivery.note}
                  </p>
                )}
              </div>
            )}

            {/* Event Timeline */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ClipboardList size={18} /> Tracking History</h3>
              <Timeline events={events} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default function TrackPage() { return <Suspense fallback={<div style={{padding:"2rem",color:"white"}}><div className="spinner" style={{width:24,height:24,marginBottom:8}}/>Loading Tracking Engine...</div>}><TrackComponent /></Suspense> }
