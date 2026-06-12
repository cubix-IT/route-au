import { point, lineString } from '@turf/helpers'
import { buffer } from '@turf/buffer'
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon'
import { nearestPointOnLine } from '@turf/nearest-point-on-line'
import { distance } from '@turf/distance'
import type { Feature, Polygon, MultiPolygon } from 'geojson'
import type { Coordinate } from '@/types'

export function coordToPoint(c: Coordinate) {
  return point([c.lng, c.lat])
}

export function coordsToLineString(coords: Coordinate[]) {
  return lineString(coords.map((c) => [c.lng, c.lat]))
}

export function buildRouteBoundingBox(coords: Coordinate[], radiusKm: number) {
  const line = coordsToLineString(coords)
  return buffer(line, radiusKm, { units: 'kilometers' })
}

export function isPointInPolygon(coord: Coordinate, polygon: Feature<Polygon | MultiPolygon>): boolean {
  return booleanPointInPolygon(coordToPoint(coord), polygon)
}

export function distanceToLine(coord: Coordinate, lineCoords: Coordinate[]): number {
  const line = coordsToLineString(lineCoords)
  const nearest = nearestPointOnLine(line, coordToPoint(coord))
  return nearest.properties.dist ?? 0
}

export function distanceBetween(a: Coordinate, b: Coordinate): number {
  return distance(coordToPoint(a), coordToPoint(b), { units: 'kilometers' })
}
