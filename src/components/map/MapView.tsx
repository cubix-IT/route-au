import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useAppStore } from '@/store/useAppStore'

interface Props {
  onMapReady?: (map: maplibregl.Map) => void
}

let protocolRegistered = false
function registerPMTiles() {
  if (protocolRegistered) return
  const protocol = new Protocol()
  maplibregl.addProtocol('pmtiles', protocol.tile.bind(protocol))
  protocolRegistered = true
}

export function MapView({ onMapReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const isProgrammaticMove = useRef(false)
  const { mapCenter, mapZoom, setMapView } = useAppStore()

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    registerPMTiles()

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [mapCenter.lng, mapCenter.lat],
      zoom: mapZoom,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    map.on('load', () => onMapReady?.(map))

    map.on('moveend', () => {
      if (isProgrammaticMove.current) {
        isProgrammaticMove.current = false
        return
      }
      const c = map.getCenter()
      setMapView({ lng: c.lng, lat: c.lat }, map.getZoom())
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // React to external setMapView calls (e.g. wizard destination selection)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const current = map.getCenter()
    // Only fly if meaningfully different (avoids feedback loop with moveend)
    const moved =
      Math.abs(current.lng - mapCenter.lng) > 0.01 ||
      Math.abs(current.lat - mapCenter.lat) > 0.01
    if (moved) {
      isProgrammaticMove.current = true
      map.flyTo({ center: [mapCenter.lng, mapCenter.lat], zoom: mapZoom, duration: 1800 })
    }
  }, [mapCenter, mapZoom])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg-deep)' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
    </div>
  )
}

// CartoDB Dark Matter — no API key required
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 512,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      paint: { 'raster-opacity': 0.92 },
    },
  ],
}
