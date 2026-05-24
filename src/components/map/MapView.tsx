import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useAppStore } from '@/store/useAppStore'
import type { Coordinate } from '@/types'

interface Props {
  onMapReady?: (map: maplibregl.Map) => void
}

// Register PMTiles protocol once globally
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
  const { mapCenter, mapZoom, setMapView } = useAppStore()

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    registerPMTiles()

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle(mapCenter),
      center: [mapCenter.lng, mapCenter.lat],
      zoom: mapZoom,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    map.on('load', () => {
      onMapReady?.(map)
    })

    map.on('moveend', () => {
      const c = map.getCenter()
      setMapView({ lng: c.lng, lat: c.lat }, map.getZoom())
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full h-full bg-slate-800">
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  )
}

function getMapStyle(center: Coordinate): maplibregl.StyleSpecification {
  // Use OpenFreeMap tiles (free, no API key needed)
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      'osm-raster': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: 'osm-raster-layer',
        type: 'raster',
        source: 'osm-raster',
        paint: {
          'raster-brightness-min': 0.1,
          'raster-brightness-max': 0.85,
          'raster-saturation': -0.3,
        },
      },
    ],
    center: [center.lng, center.lat],
    zoom: 4,
  }
}
