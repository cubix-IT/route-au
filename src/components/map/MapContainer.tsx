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

  // Draw route + endpoint pins when itinerary changes
  useEffect(() => {
    if (!map) return

    const waypoints = activeItinerary?.route.waypoints ?? []
    const rawCoords = waypoints.map((w) => [w.coord.lng, w.coord.lat] as [number, number])

    pinMarkersRef.current.forEach((m) => m.remove())
    pinMarkersRef.current = []

    if (rawCoords.length < 2) {
      setRouteLine(map, [])
      return
    }

    const origin = rawCoords[0]
    const dest = rawCoords[rawCoords.length - 1]

    // Origin marker — green dot
    const originEl = document.createElement('div')
    originEl.innerHTML = `<div style="
      width:12px;height:12px;border-radius:50%;
      background:#3A6B4F;border:2.5px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`
    pinMarkersRef.current.push(
      new maplibregl.Marker({ element: originEl })
        .setLngLat(origin)
        .setPopup(new maplibregl.Popup({ offset: 14, closeButton: false })
          .setText(waypoints[0].label))
        .addTo(map)
    )

    // Destination marker — amber pin
    const destEl = document.createElement('div')
    destEl.innerHTML = `<div style="
      width:18px;height:24px;display:flex;align-items:center;justify-content:center">
      <svg viewBox="0 0 18 24" width="18" height="24" fill="none">
        <path d="M9 0C4 0 0 4 0 9c0 6.6 9 15 9 15s9-8.4 9-15c0-5-4-9-9-9z" fill="#B87333"/>
        <circle cx="9" cy="9" r="3.5" fill="#fff"/>
      </svg></div>`
    pinMarkersRef.current.push(
      new maplibregl.Marker({ element: destEl })
        .setLngLat(dest)
        .setPopup(new maplibregl.Popup({ offset: 28, closeButton: false })
          .setText(waypoints[waypoints.length - 1].label))
        .addTo(map)
    )

    // Draw straight line immediately, then upgrade to real road geometry
    setRouteLine(map, [origin, dest])
    fetchRoadRoute(origin, dest).then((coords) => {
      if (coords.length > 2) setRouteLine(map, coords)
    })

    // Auto-focus: fit to destination with ~15km buffer
    const destCoord = activeItinerary?.route.waypoints.at(-1)?.coord
    if (destCoord) {
      const KM_PER_DEG = 111
      const bufferDeg = 15 / KM_PER_DEG
      const sw: [number, number] = [destCoord.lng - bufferDeg, destCoord.lat - bufferDeg]
      const ne: [number, number] = [destCoord.lng + bufferDeg, destCoord.lat + bufferDeg]
      // Expand to include origin for context
      const bounds = new maplibregl.LngLatBounds(sw, ne).extend(origin)
      map.fitBounds(bounds, { padding: { top: 55, bottom: 55, left: 35, right: 35 }, maxZoom: 12, duration: 900 })
    }
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
      const popup = new maplibregl.Popup({ offset: 18, closeButton: false, maxWidth: '200px' })
        .setHTML(`
          <div style="padding:2px 0">
            <div style="font-size:12px;font-weight:700;color:#1C1C1A;line-height:1.3">${pin.name}</div>
            <div style="font-size:11px;color:#8C8A87;margin-top:3px">${emoji} ${typeLabel}</div>
          </div>
        `)

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pin.lng, pin.lat])
        .setPopup(popup)
        .addTo(map)

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.3)'
        el.style.boxShadow = `0 4px 14px rgba(0,0,0,0.25), 0 0 0 3px ${color}33`
        popup.addTo(map)
      })
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)'
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)'
        popup.remove()
      })
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        setSelectedPinId(pin.id)
      })

      poiMarkersRef.current.push(marker)
    }
  }, [map, displayedMapPins])

  // Fuel station markers — cheapest 1st/2nd/3rd near route midpoint
  useEffect(() => {
    if (!map || !activeItinerary || !vehicleProfile) return

    fuelMarkersRef.current.forEach((m) => m.remove())
    fuelMarkersRef.current = []

    if (vehicleProfile.fuel_type === 'Electric') return

    const waypoints = activeItinerary.route.waypoints
    if (waypoints.length < 2) return

    const origin = waypoints[0].coord
    const dest = waypoints[waypoints.length - 1].coord
    const midLat = (origin.lat + dest.lat) / 2
    const midLng = (origin.lng + dest.lng) / 2

    const RANK_COLORS = ['#16A34A', '#D97706', '#6B7280']
    const RANK_LABELS = ['1st', '2nd', '3rd']

    fetch(`/api/fuel?lat=${midLat}&lng=${midLng}&fuelType=${vehicleProfile.fuel_type}&limit=3&radius=40`)
      .then((r) => r.json())
      .then((data) => {
        const stations: FuelStation[] = (data as { stations: FuelStation[] }).stations ?? []
        for (let i = 0; i < stations.length; i++) {
          const st = stations[i]
          const color = RANK_COLORS[i]
          const rank = RANK_LABELS[i]

          const el = document.createElement('div')
          el.style.cssText = `
            width: 38px; height: 38px; border-radius: 50%;
            background: white; border: 2.5px solid ${color};
            display: flex; align-items: center; justify-content: center;
            font-size: 16px; cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.20);
            position: relative; transition: transform 0.12s;
          `
          el.innerHTML = `⛽<div style="
            position:absolute;top:-4px;right:-4px;
            width:16px;height:16px;border-radius:50%;
            background:${color};color:#fff;
            font-size:8px;font-weight:800;
            display:flex;align-items:center;justify-content:center;
            border:1.5px solid #fff;
          ">${i + 1}</div>`

          const popup = new maplibregl.Popup({ offset: 22, closeButton: false, maxWidth: '210px' })
            .setHTML(`
              <div style="padding:4px 0">
                <div style="font-size:12px;font-weight:700;color:#1C1C1A">${st.brand}</div>
                <div style="font-size:11px;color:#8C8A87;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px">${st.address}</div>
                <div style="font-size:16px;font-weight:800;color:${color};margin-top:5px">$${st.pricePerLitre.toFixed(3)}<span style="font-size:10px;font-weight:500;color:#8C8A87">/L</span></div>
                <div style="font-size:10px;color:#8C8A87">${rank} cheapest · ${st.distanceKm} km from midpoint</div>
              </div>
            `)

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([st.lng, st.lat])
            .setPopup(popup)
            .addTo(map)

          el.addEventListener('mouseenter', () => {
            el.style.transform = 'scale(1.2)'
            popup.addTo(map)
          })
          el.addEventListener('mouseleave', () => {
            el.style.transform = 'scale(1)'
            popup.remove()
          })

          fuelMarkersRef.current.push(marker)
        }
      })
      .catch(() => {})
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

async function fetchRoadRoute(
  origin: [number, number],
  dest: [number, number],
): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${dest[0]},${dest[1]}?overview=full&geometries=geojson`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return [origin, dest]
    const json = await res.json()
    const coords: [number, number][] = json.routes?.[0]?.geometry?.coordinates ?? []
    return coords.length >= 2 ? coords : [origin, dest]
  } catch {
    return [origin, dest]
  }
}

function setRouteLine(map: maplibregl.Map, coords: [number, number][]) {
  const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords },
    properties: {},
  }

  if (map.getSource('route')) {
    ;(map.getSource('route') as maplibregl.GeoJSONSource).setData(geojson)
    return
  }

  if (!map.isStyleLoaded()) {
    map.once('load', () => setRouteLine(map, coords))
    return
  }

  map.addSource('route', { type: 'geojson', data: geojson })
  // Casing layer for contrast
  map.addLayer({
    id: 'route-line-casing',
    type: 'line',
    source: 'route',
    paint: { 'line-color': '#fff', 'line-width': 5, 'line-opacity': 0.6 },
  })
  map.addLayer({
    id: 'route-line',
    type: 'line',
    source: 'route',
    paint: { 'line-color': '#B87333', 'line-width': 3, 'line-opacity': 0.85 },
  })
}

function categoryEmoji(cat: string): string {
  const m: Record<string, string> = {
    Hiking: '🥾', Chilling: '🏖', Lookouts: '👁',
    Photography: '📷', FreeCamping: '⛺', History: '🏛',
    Wildlife: '🦘', Beach: '🌊',
  }
  return m[cat] ?? '📍'
}
