'use client'

import { useEffect, useRef } from 'react'

export default function AgentMap({ locations = [], singleLocation = null }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Dynamically import leaflet CSS and library
    import('leaflet').then((L) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      if (!mapRef.current) return
      if (mapInstance.current) {
        // Map already initialized — just update markers
        updateMarkers(L, mapInstance.current)
        return
      }

      const defaultCenter = singleLocation
        ? [singleLocation.lat, singleLocation.lng]
        : locations.length > 0
          ? [locations[0].lat, locations[0].lng]
          : [20.5937, 78.9629] // India center

      const map = L.map(mapRef.current).setView(defaultCenter, singleLocation ? 13 : 5)
      mapInstance.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors, © CARTO',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map)

      updateMarkers(L, map)
    })

    function updateMarkers(L, map) {
      // Clear existing markers
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      const agentIcon = L.divIcon({
        html: `<div style="
          width:32px;height:32px;
          background:var(--accent-primary,#F59E0B);
          border:3px solid var(--surface-2);
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 0 15px rgba(245,158,11,0.5);
          display:flex;align-items:center;justify-content:center;
        "><span style="transform:rotate(45deg);font-size:14px">🛵</span></div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      })

      if (singleLocation?.lat) {
        const m = L.marker([singleLocation.lat, singleLocation.lng], { icon: agentIcon })
          .addTo(map)
          .bindPopup(`<strong>Agent Location</strong><br>Updated: ${singleLocation.updatedAt ? new Date(singleLocation.updatedAt).toLocaleTimeString() : '—'}`)
        markersRef.current.push(m)
      }

      locations.forEach((loc) => {
        if (!loc?.lat) return
        const m = L.marker([loc.lat, loc.lng], { icon: agentIcon })
          .addTo(map)
          .bindPopup(`<strong>${loc.name || 'Agent'}</strong><br>${loc.updatedAt ? new Date(loc.updatedAt).toLocaleTimeString() : ''}`)
        markersRef.current.push(m)
      })
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  return (
    <div
      ref={mapRef}
      id="agent-map"
      style={{
        width: '100%',
        height: '100%',
        minHeight: 300,
        background: 'var(--surface-2)',
      }}
    />
  )
}
