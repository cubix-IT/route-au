import { useEffect, useRef, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import { MapView } from './MapView'
import { useAppStore } from '@/store/useAppStore'
import { useDrivingRoute } from '@/hooks/useDrivingRoute'
import { findCheapestOnRoute } from '@/lib/fuelOnRoute'

// Stable ref to avoid re-creating markers on every render
type MarkerEntry = { marker: maplibregl.Marker; el: HTMLElement; id: string }

const HAZARD_EMOJI: Record<string, string> = {
  Fire: '🔥', Flooding: '💧', Met: '⛈️',
}

export function MapContainer() {
  const mapRef = useRef<maplibregl.Map | null>(null)
  const destMarkerRef = useRef<maplibregl.Marker | null>(null)
  const poiMarkersRef = useRef<MarkerEntry[]>([])
  const fuelMarkersRef = useRef<maplibregl.Marker[]>([])
  const legacyMarkersRef = useRef<maplibregl.Marker[]>([])
  const hazardMarkersRef = useRef<maplibregl.Marker[]>([])

  const {
    activeItinerary, nearbyPOIs, displayedMapPins,
    vehicleProfile, setSelectedPOI, selectedPinId, setSelectedPinId,
    activeHazards, activePOIFilter, originCoord, destCoord,
  } = useAppStore()

  // Real driving route — fetched once per trip (usually already cached from the wizard)
  const { route } = useDrivingRoute(activeItinerary ? originCoord : null, activeItinerary ? destCoord : null)

  const handleMapReady = useCallback((m: maplibregl.Map) => {
    mapRef.current = m
  }, [])

  // ── Route line — the actual roads, not a straight line ───────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const draw = () => {
      const src = map.getSource('ue-route') as maplibregl.GeoJSONSource | undefined
      const data: GeoJSON.Feature = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: route ? route.geometry.map((c) => [c.lng, c.lat]) : [],
        },
      }
      if (src) {
        src.setData(data)
      } else {
        map.addSource('ue-route', { type: 'geojson', data })
        map.addLayer({
          id: 'ue-route-casing',
          type: 'line',
          source: 'ue-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.9 },
        })
        map.addLayer({
          id: 'ue-route-line',
          type: 'line',
          source: 'ue-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#2F6B4F', 'line-width': 3.5, 'line-opacity': 0.85 },
        })
      }
    }

    if (map.isStyleLoaded()) {
      draw()
    } else {
      // 'load' won't refire if the style finished before we attached; 'idle'
      // always fires after the next render pass. draw() is idempotent
      // (setData on existing source), so firing both is harmless.
      map.once('load', draw)
      map.once('idle', draw)
    }
    return () => { map.off('load', draw); map.off('idle', draw) }
  }, [route])

  // ── Fit to full route when the Fuel tab is active ─────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || activePOIFilter !== 'fuel' || !route) return
    const bounds = new maplibregl.LngLatBounds()
    for (const c of route.geometry) bounds.extend([c.lng, c.lat])
    map.fitBounds(bounds, { padding: { top: 60, bottom: 60, left: 45, right: 45 }, duration: 800 })
  }, [activePOIFilter, route])

  // ── Destination pin + initial centering ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    destMarkerRef.current?.remove()
    destMarkerRef.current = null

    const destCoord = activeItinerary?.route?.waypoints.at(-1)?.coord
    if (!destCoord) return

    const el = document.createElement('div')
    el.innerHTML = `<div style="width:20px;height:26px;display:flex;align-items:center;justify-content:center">
      <svg viewBox="0 0 18 24" width="20" height="26" fill="none">
        <path d="M9 0C4 0 0 4 0 9c0 6.6 9 15 9 15s9-8.4 9-15c0-5-4-9-9-9z" fill="#B87333"/>
        <circle cx="9" cy="9" r="3.5" fill="#fff"/>
      </svg></div>`

    const label = activeItinerary?.route?.waypoints.at(-1)?.label ?? ''
    destMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([destCoord.lng, destCoord.lat])
      .setPopup(new maplibregl.Popup({ offset: 28, closeButton: false }).setText(label))
      .addTo(map)

    // Centre on destination — no POI pins yet
    const buf = 8 / 111
    map.fitBounds(
      [[destCoord.lng - buf, destCoord.lat - buf], [destCoord.lng + buf, destCoord.lat + buf]],
      { padding: { top: 55, bottom: 55, left: 35, right: 35 }, maxZoom: 14, duration: 900 }
    )
  }, [activeItinerary]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── POI markers — rebuilt when pins change ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    poiMarkersRef.current.forEach(({ marker }) => marker.remove())
    poiMarkersRef.current = []

    if (displayedMapPins.length === 0) {
      // No tab selected — re-centre on destination
      const destCoord = activeItinerary?.route?.waypoints.at(-1)?.coord
      if (destCoord) {
        const buf = 8 / 111
        map.fitBounds(
          [[destCoord.lng - buf, destCoord.lat - buf], [destCoord.lng + buf, destCoord.lat + buf]],
          { padding: { top: 55, bottom: 55, left: 35, right: 35 }, maxZoom: 14, duration: 700 }
        )
      }
      return
    }

    const bounds = new maplibregl.LngLatBounds()
    const destCoord = activeItinerary?.route?.waypoints.at(-1)?.coord
    if (destCoord) bounds.extend([destCoord.lng, destCoord.lat])

    for (const pin of displayedMapPins) {
      const emoji = pin.emoji ?? '📍'

      const el = document.createElement('div')
      // Outer el is MapLibre's positioning anchor — never modify its transform
      el.style.cssText = `display: flex; align-items: center; justify-content: center;`

      const inner = document.createElement('div')
      inner.style.cssText = `
        min-width: 30px; height: 30px; padding: 0 6px;
        border-radius: 15px; background: white;
        border: 2.5px solid #374151;
        display: flex; align-items: center; justify-content: center; gap: 3px;
        font-size: 14px; cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        transition: transform 0.12s, box-shadow 0.12s;
        white-space: nowrap;
      `
      inner.textContent = emoji
      el.appendChild(inner)

      const popup = new maplibregl.Popup({ offset: 18, closeButton: true, maxWidth: '220px', closeOnClick: false })
        .setHTML(`
          <div style="padding:4px 0;font-family:system-ui,sans-serif">
            <div style="font-size:13px;font-weight:700;color:#1C1C1A;line-height:1.3;margin-bottom:4px">${pin.name}</div>
            <div style="font-size:11px;color:#8C8A87;margin-bottom:8px">${emoji} ${pin.type}</div>
            <a href="https://maps.google.com/maps?q=${pin.lat},${pin.lng}+(${encodeURIComponent(pin.name)})" target="_blank" rel="noopener noreferrer"
              style="display:inline-block;font-size:11px;font-weight:700;color:#fff;background:#1C1B1F;padding:5px 10px;border-radius:6px;text-decoration:none">
              Open in Maps ↗
            </a>
          </div>
        `)

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pin.lng, pin.lat])
        .setPopup(popup)
        .addTo(map)

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        // Close all other popups first
        poiMarkersRef.current.forEach(({ marker: m }) => {
          if (m !== marker && m.getPopup()?.isOpen()) m.togglePopup()
        })
        if (!marker.getPopup()?.isOpen()) marker.togglePopup()
        setSelectedPinId(pin.id)
        highlightMarker(inner)
      })

      bounds.extend([pin.lng, pin.lat])
      poiMarkersRef.current.push({ marker, el: inner, id: pin.id })
    }

    // Keep map centred on destination — don't fly to POI pins (mobile UX: city stays in frame)
  }, [displayedMapPins]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Highlight selected pin when changed from card click ───────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!selectedPinId || !map) return

    const entry = poiMarkersRef.current.find((e) => e.id === selectedPinId)
    if (!entry) return

    // Highlight the marker
    highlightMarker(entry.el)

    // Close all other popups, fly to selected, open its popup
    poiMarkersRef.current.forEach(({ marker: m }) => {
      if (m !== entry.marker && m.getPopup()?.isOpen()) m.togglePopup()
    })
    map.flyTo({ center: [entry.marker.getLngLat().lng, entry.marker.getLngLat().lat], zoom: Math.max(map.getZoom(), 14), duration: 500 })
    if (!entry.marker.getPopup()?.isOpen()) entry.marker.togglePopup()
  }, [selectedPinId])

  // ── Fuel markers — cheapest stations on the actual driving route ──────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !activeItinerary || !vehicleProfile || !route) return

    fuelMarkersRef.current.forEach((m) => m.remove())
    fuelMarkersRef.current = []

    if (vehicleProfile.fuel_type === 'Electric') return
    if ((vehicleProfile as { skip_fuel?: boolean }).skip_fuel) return

    let cancelled = false
    const brand = (vehicleProfile as { fuel_brand?: string | null }).fuel_brand

    findCheapestOnRoute(route.geometry, vehicleProfile.fuel_type, brand, 3).then((stations) => {
      if (cancelled || !mapRef.current) return
      if (stations.length) useAppStore.getState().setCheapestFuelPrice(Math.min(...stations.map(s => s.pricePerLitre)))

      stations.forEach((st) => {
        const color = st.isCheapestOverall ? '#16A34A' : '#6B7280' // cheapest green, rest grey
        const el = document.createElement('div')
        el.style.cssText = `background:#fff;border:2px solid ${color};border-radius:8px;padding:3px 7px;display:flex;align-items:center;gap:4px;font-size:11px;font-weight:700;color:${color};cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.18);white-space:nowrap;transition:transform 0.12s`
        el.innerHTML = `⛽ $${st.pricePerLitre.toFixed(3)}`
        const popup = new maplibregl.Popup({ offset: 14, closeButton: true, maxWidth: '220px', closeOnClick: false })
          .setHTML(`<div style="padding:4px 0;font-family:system-ui,sans-serif"><div style="font-size:12px;font-weight:700;color:#1C1C1A">${st.name}</div><div style="font-size:11px;color:#8C8A87;margin-top:2px">${st.address}</div><div style="font-size:18px;font-weight:800;color:${color};margin-top:5px">$${st.pricePerLitre.toFixed(3)}<span style="font-size:10px;font-weight:500;color:#8C8A87">/L</span></div><div style="font-size:10px;color:#8C8A87;margin-top:2px">${st.isCheapestOverall ? `🏆 Cheapest on route · ${st.legLabel.toLowerCase()}` : st.legLabel} · ${st.kmFromRoute} km off route</div></div>`)
        const marker = new maplibregl.Marker({ element: el }).setLngLat([st.lng, st.lat]).setPopup(popup).addTo(mapRef.current!)
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.1)'; popup.addTo(mapRef.current!) })
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; popup.remove() })
        el.addEventListener('click', (e) => { e.stopPropagation(); popup.addTo(mapRef.current!) })
        fuelMarkersRef.current.push(marker)
      })
    })

    return () => { cancelled = true }
  }, [activeItinerary, vehicleProfile, route]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Legacy scored POI markers ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    legacyMarkersRef.current.forEach((m) => m.remove())
    legacyMarkersRef.current = []
    for (const poi of nearbyPOIs) {
      const el = document.createElement('div')
      el.className = 'poi-marker'
      el.textContent = legacyEmoji(poi.category)
      el.addEventListener('click', () => setSelectedPOI(poi))
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([poi.coord.lng, poi.coord.lat])
        .setPopup(new maplibregl.Popup({ offset: 20, closeButton: false }).setHTML(
          `<strong style="color:var(--text-primary)">${poi.name}</strong><br><span style="font-size:12px;color:var(--text-muted)">${poi.description.slice(0, 80)}…</span>`
        ))
        .addTo(map)
      legacyMarkersRef.current.push(marker)
    }
  }, [nearbyPOIs, setSelectedPOI])

  // ── Hazard markers ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    hazardMarkersRef.current.forEach((m) => m.remove())
    hazardMarkersRef.current = []

    for (const h of activeHazards) {
      if (h.lat == null || h.lng == null) continue
      const emoji = HAZARD_EMOJI[h.category] ?? '⚠️'
      const isUrgent = h.severity === 'urgent'

      const el = document.createElement('div')
      el.style.cssText = `
        width: 36px; height: 36px; border-radius: 50%;
        background: ${isUrgent ? '#FEF2F2' : '#FFF7ED'};
        border: 2.5px solid ${isUrgent ? '#DC2626' : '#D97706'};
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        animation: pulse 2s infinite;
      `
      el.textContent = emoji

      const popup = new maplibregl.Popup({ offset: 20, closeButton: true, maxWidth: '240px', closeOnClick: false })
        .setHTML(`
          <div style="padding:4px 0;font-family:system-ui,sans-serif">
            <div style="font-size:13px;font-weight:700;color:${isUrgent ? '#B91C1C' : '#92400E'};margin-bottom:4px">${emoji} ${h.title}</div>
            <div style="font-size:11px;color:#6B7280;margin-bottom:6px">${h.category} · ${h.status} · ${h.distanceKm} km away</div>
            ${h.url ? `<a href="${h.url}" target="_blank" rel="noopener noreferrer" style="font-size:11px;font-weight:700;color:#fff;background:#DC2626;padding:5px 10px;border-radius:6px;text-decoration:none;display:inline-block">View on VicEmergency ↗</a>` : ''}
          </div>
        `)

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([h.lng, h.lat])
        .setPopup(popup)
        .addTo(map)

      el.addEventListener('click', (e) => { e.stopPropagation(); popup.addTo(map) })
      hazardMarkersRef.current.push(marker)
    }
  }, [activeHazards]) // eslint-disable-line react-hooks/exhaustive-deps

  return <MapView onMapReady={handleMapReady} />
}

function highlightMarker(el: HTMLElement) {
  el.style.transform = 'scale(1.35)'
  el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.28)'
  el.style.zIndex = '10'
  setTimeout(() => {
    el.style.transform = 'scale(1)'
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)'
    el.style.zIndex = ''
  }, 1500)
}

function legacyEmoji(cat: string): string {
  const m: Record<string, string> = {
    Hiking: '🥾', Chilling: '🏖', Lookouts: '👁', Photography: '📷',
    FreeCamping: '⛺', History: '🏛', Wildlife: '🦘', Beach: '🌊',
  }
  return m[cat] ?? '📍'
}
