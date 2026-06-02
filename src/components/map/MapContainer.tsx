import { useEffect, useRef, useCallback, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { MapView } from './MapView'
import { useAppStore } from '@/store/useAppStore'

const PIN_EMOJI: Record<string, string> = {
  cafe: '☕', restaurant: '🍽', pub: '🍺', winery: '🍷',
  bakery: '🥐', fast_food: '🥡', hiking: '🥾',
  viewpoint: '👁', attraction: '🏛', campsite: '⛺', hotel: '🏨',
}

const PIN_COLOR: Record<string, string> = {
  cafe: '#92400E', restaurant: '#B45309', pub: '#B87333', winery: '#7E22CE',
  bakery: '#92400E', fast_food: '#9A3412', hiking: '#2563EB',
  viewpoint: '#4338CA', attraction: '#7C3AED', campsite: '#047857', hotel: '#1D4ED8',
}

interface FuelStation {
  id: string
  name: string
  brand: string
  address: string
  lat: number
  lng: number
  priceCents: number
  pricePerLitre: number
  distanceKm: number
}

export function MapContainer() {
  const [map, setMap] = useState<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const pinMarkersRef = useRef<maplibregl.Marker[]>([])
  const poiMarkersRef = useRef<maplibregl.Marker[]>([])
  const fuelMarkersRef = useRef<maplibregl.Marker[]>([])
  const { activeItinerary, nearbyPOIs, displayedMapPins, vehicleProfile, setSelectedPOI, setSelectedPinId } = useAppStore()

  const handleMapReady = useCallback((m: maplibregl.Map) => {
    setMap(m)
  }, [])

  // Focus map on destination when itinerary changes
  useEffect(() => {
    if (!map) return

    pinMarkersRef.current.forEach((m) => m.remove())
    pinMarkersRef.current = []

    const destCoord = activeItinerary?.route?.waypoints.at(-1)?.coord
    if (!destCoord) return

    // Destination marker — amber pin
    const destEl = document.createElement('div')
    destEl.innerHTML = `<div style="width:20px;height:26px;display:flex;align-items:center;justify-content:center">
      <svg viewBox="0 0 18 24" width="20" height="26" fill="none">
        <path d="M9 0C4 0 0 4 0 9c0 6.6 9 15 9 15s9-8.4 9-15c0-5-4-9-9-9z" fill="#B87333"/>
        <circle cx="9" cy="9" r="3.5" fill="#fff"/>
      </svg></div>`
    const destLabel = activeItinerary?.route?.waypoints.at(-1)?.label ?? ''
    pinMarkersRef.current.push(
      new maplibregl.Marker({ element: destEl })
        .setLngLat([destCoord.lng, destCoord.lat])
        .setPopup(new maplibregl.Popup({ offset: 28, closeButton: false }).setText(destLabel))
        .addTo(map)
    )

    // Zoom to destination area (~8km radius to show local pins)
    const KM_PER_DEG = 111
    const bufferDeg = 8 / KM_PER_DEG
    map.fitBounds(
      [[destCoord.lng - bufferDeg, destCoord.lat - bufferDeg], [destCoord.lng + bufferDeg, destCoord.lat + bufferDeg]],
      { padding: { top: 55, bottom: 55, left: 35, right: 35 }, maxZoom: 14, duration: 900 }
    )
  }, [map, activeItinerary])

  // Reactive POI markers — updates when filter changes
  useEffect(() => {
    if (!map) return

    poiMarkersRef.current.forEach((m) => m.remove())
    poiMarkersRef.current = []

    for (const pin of displayedMapPins) {
      const emoji = PIN_EMOJI[pin.type] ?? '📍'
      const color = PIN_COLOR[pin.type] ?? '#374151'

      const el = document.createElement('div')
      el.style.cssText = `
        width: 30px; height: 30px; border-radius: 50%;
        background: white; border: 2.5px solid ${color};
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        transition: transform 0.12s, box-shadow 0.12s;
      `
      el.textContent = emoji

      const typeLabel = pin.type.replace(/_/g, ' ')
      const mapsUrl = pin.placeId
        ? `https://www.google.com/maps/place/?q=place_id:${pin.placeId}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pin.name)}`
      const popup = new maplibregl.Popup({ offset: 18, closeButton: true, maxWidth: '220px', closeOnClick: false })
        .setHTML(`
          <div style="padding:4px 0;font-family:system-ui,sans-serif">
            <div style="font-size:13px;font-weight:700;color:#1C1C1A;line-height:1.3;margin-bottom:4px">${pin.name}</div>
            <div style="font-size:11px;color:#8C8A87;margin-bottom:8px">${emoji} ${typeLabel}</div>
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
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
        popup.addTo(map)
        setSelectedPinId(pin.id)
        el.style.transform = 'scale(1.25)'
        setTimeout(() => { el.style.transform = 'scale(1)' }, 200)
      })

      poiMarkersRef.current.push(marker)
    }
  }, [map, displayedMapPins])

  // Fuel station markers — cheapest near start, midpoint, destination
  useEffect(() => {
    if (!map || !activeItinerary || !vehicleProfile) return

    fuelMarkersRef.current.forEach((m) => m.remove())
    fuelMarkersRef.current = []

    if (vehicleProfile.fuel_type === 'Electric') return
    if ((vehicleProfile as { skip_fuel?: boolean }).skip_fuel) return

    const waypoints = activeItinerary.route?.waypoints
    if (!waypoints || waypoints.length < 2) return

    const origin = waypoints[0].coord
    const dest = waypoints[waypoints.length - 1].coord
    const mid = { lat: (origin.lat + dest.lat) / 2, lng: (origin.lng + dest.lng) / 2 }

    const SPOTS = [
      { coord: origin, label: 'near start' },
      { coord: mid,    label: 'en route' },
      { coord: dest,   label: 'near destination' },
    ]

    SPOTS.forEach(({ coord, label }) => {
      const brand = (vehicleProfile as { fuel_brand?: string | null }).fuel_brand
      const brandQ = brand && brand !== 'Any' ? `&brand=${encodeURIComponent(brand)}` : ''
      fetch(`/api/fuel?lat=${coord.lat}&lng=${coord.lng}&fuelType=${vehicleProfile.fuel_type}&limit=1&radius=40${brandQ}`)
        .then((r) => r.json())
        .then((data) => {
          const st: FuelStation | undefined = (data as { stations: FuelStation[] }).stations?.[0]
          if (!st) return

          const el = document.createElement('div')
          el.style.cssText = `
            background: #fff; border: 2px solid #16A34A; border-radius: 8px;
            padding: 3px 7px; display: flex; align-items: center; gap: 4px;
            font-size: 11px; font-weight: 700; color: #16A34A;
            cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.18);
            white-space: nowrap; transition: transform 0.12s;
          `
          el.innerHTML = `⛽ $${st.pricePerLitre.toFixed(3)}`

          const popup = new maplibregl.Popup({ offset: 14, closeButton: true, maxWidth: '220px', closeOnClick: false })
            .setHTML(`
              <div style="padding:4px 0;font-family:system-ui,sans-serif">
                <div style="font-size:12px;font-weight:700;color:#1C1C1A">${st.name}</div>
                <div style="font-size:11px;color:#8C8A87;margin-top:2px">${st.address}</div>
                <div style="font-size:18px;font-weight:800;color:#16A34A;margin-top:5px">$${st.pricePerLitre.toFixed(3)}<span style="font-size:10px;font-weight:500;color:#8C8A87">/L</span></div>
                <div style="font-size:10px;color:#8C8A87;margin-top:2px">Cheapest ${label} · ${st.distanceKm} km away</div>
              </div>
            `)

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([st.lng, st.lat])
            .setPopup(popup)
            .addTo(map)

          el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.1)'; popup.addTo(map) })
          el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; popup.remove() })
          el.addEventListener('click', (e) => { e.stopPropagation(); popup.addTo(map) })

          fuelMarkersRef.current.push(marker)
        })
        .catch(() => {})
    })
  }, [map, activeItinerary, vehicleProfile])

  // Legacy scored POI markers (from POI scoring system)
  useEffect(() => {
    if (!map) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    for (const poi of nearbyPOIs) {
      const el = document.createElement('div')
      el.className = 'poi-marker'
      el.textContent = categoryEmoji(poi.category)
      el.addEventListener('click', () => setSelectedPOI(poi))

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([poi.coord.lng, poi.coord.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 20, closeButton: false }).setHTML(
            `<strong style="color:var(--text-primary)">${poi.name}</strong><br>
             <span style="font-size:12px;color:var(--text-muted)">${poi.description.slice(0, 80)}…</span>`
          )
        )
        .addTo(map)

      markersRef.current.push(marker)
    }
  }, [map, nearbyPOIs, setSelectedPOI])

  return <MapView onMapReady={handleMapReady} />
}


function categoryEmoji(cat: string): string {
  const m: Record<string, string> = {
    Hiking: '🥾', Chilling: '🏖', Lookouts: '👁',
    Photography: '📷', FreeCamping: '⛺', History: '🏛',
    Wildlife: '🦘', Beach: '🌊',
  }
  return m[cat] ?? '📍'
}
