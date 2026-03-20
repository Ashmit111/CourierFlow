'use client'

import { useEffect, useRef } from 'react'

export default function AgentMap({ locations = [], singleLocation = null }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const leafletRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Dynamically import leaflet CSS and library
    import('leaflet').then((L) => {
      leafletRef.current = L
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

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors, © CARTO',
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
          border:3px solid #ffffff;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 0 15px rgba(245,158,11,0.5);
          display:flex;align-items:center;justify-content:center;
        "><span style="transform:rotate(45deg);font-size:14px">🛵</span></div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      })

      if (typeof singleLocation?.lat === 'number' && typeof singleLocation?.lng === 'number') {
        const m = L.marker([singleLocation.lat, singleLocation.lng], { icon: agentIcon })
          .addTo(map)
          .bindPopup(`<strong>Agent Location</strong><br>Updated: ${singleLocation.updatedAt ? new Date(singleLocation.updatedAt).toLocaleTimeString() : '—'}`)
        markersRef.current.push(m)
        map.setView([singleLocation.lat, singleLocation.lng], Math.max(map.getZoom(), 13))
      }

      locations.forEach((loc) => {
        if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') return
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

  useEffect(() => {
    if (!mapInstance.current || !leafletRef.current) return

    const L = leafletRef.current
    const map = mapInstance.current

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const agentIcon = L.divIcon({
      html: `<div style="
        width:32px;height:32px;
        background:var(--accent-primary,#F59E0B);
        border:3px solid #ffffff;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 0 15px rgba(245,158,11,0.5);
        display:flex;align-items:center;justify-content:center;
      "><span style="transform:rotate(45deg);font-size:14px">🛵</span></div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    })

    if (typeof singleLocation?.lat === 'number' && typeof singleLocation?.lng === 'number') {
      const m = L.marker([singleLocation.lat, singleLocation.lng], { icon: agentIcon })
        .addTo(map)
        .bindPopup(`<strong>Agent Location</strong><br>Updated: ${singleLocation.updatedAt ? new Date(singleLocation.updatedAt).toLocaleTimeString() : '—'}`)
      markersRef.current.push(m)
      map.setView([singleLocation.lat, singleLocation.lng], Math.max(map.getZoom(), 13))
    }

    locations.forEach((loc) => {
      if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') return
      const m = L.marker([loc.lat, loc.lng], { icon: agentIcon })
        .addTo(map)
        .bindPopup(`<strong>${loc.name || 'Agent'}</strong><br>${loc.updatedAt ? new Date(loc.updatedAt).toLocaleTimeString() : ''}`)
      markersRef.current.push(m)
    })
  }, [singleLocation, locations])

  return (
    <div
      ref={mapRef}
      id="agent-map"
      style={{
        width: '100%',
        height: '100%',
        minHeight: 300,
        background: '#f3f4f6',
      }}
    />
  )
}
