/**
 * Pilot scanner: what does OSM have in an area that our enrichment ignores?
 * Extracts named walks/hikes (highway=path|footway|track|steps), route
 * relations (hiking/cycling), and tallies useful tags we currently drop
 * (sac_scale, surface, wheelchair, opening_hours:kitchen, fee, man_made…).
 *
 * Usage: npx tsx --env-file=.env scripts/scan-area.mts --lat -37.52 --lng 145.35 --radius 12
 */

import { createReadStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Transform } from 'stream'
import path from 'path'
import { fileURLToPath } from 'url'
import parseOSM from 'osm-pbf-parser'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PBF_PATH = path.resolve(__dirname, '../data/victoria-latest.osm.pbf')

const args = process.argv.slice(2)
const argval = (k: string, dflt: number) => { const i = args.indexOf(k); return i !== -1 ? parseFloat(args[i + 1]) : dflt }
const LAT = argval('--lat', -37.52)
const LNG = argval('--lng', 145.35)
const RADIUS = argval('--radius', 12)

const latDelta = RADIUS / 111
const lngDelta = RADIUS / (111 * Math.cos(LAT * Math.PI / 180))
const inBbox = (lat: number, lng: number) =>
  Math.abs(lat - LAT) <= latDelta && Math.abs(lng - LNG) <= lngDelta

const WALK_HIGHWAYS = new Set(['path', 'footway', 'track', 'steps', 'cycleway', 'bridleway'])
const ROUTE_TYPES = new Set(['hiking', 'foot', 'walking', 'bicycle', 'mtb'])
// Tag keys our pipeline currently reads at parse time
const CURRENT_KEYS = new Set(['tourism','natural','amenity','shop','craft','leisure','boundary','historic','waterway','railway'])

function dist(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371, dLat = (bLat - aLat) * Math.PI / 180, dLng = (bLng - aLng) * Math.PI / 180
  const x = Math.sin(dLat/2)**2 + Math.cos(aLat*Math.PI/180)*Math.cos(bLat*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x))
}

// ── Pass 1: nodes in bbox ────────────────────────────────────────────────────
console.log(`Scanning ${RADIUS}km around ${LAT},${LNG}`)
process.stdout.write('Pass 1: nodes…')
const nodeCoord = new Map<number, [number, number]>()
interface NamedThing { id: number; kind: string; lat: number; lng: number; tags: Record<string,string> }
const namedNodes: NamedThing[] = []

await pipeline(
  createReadStream(PBF_PATH),
  parseOSM() as any,
  new Transform({
    objectMode: true,
    transform(items: any[], _e, cb) {
      for (const it of items) {
        if (it.type !== 'node') continue
        if (!inBbox(it.lat, it.lon)) continue
        nodeCoord.set(it.id, [it.lat, it.lon])
        if (it.tags?.name) namedNodes.push({ id: it.id, kind: 'node', lat: it.lat, lng: it.lon, tags: it.tags })
      }
      cb()
    },
  }),
)
console.log(` ${nodeCoord.size.toLocaleString()} in bbox, ${namedNodes.length} named`)

// ── Pass 2: ways + relations ─────────────────────────────────────────────────
process.stdout.write('Pass 2: ways + relations…')
interface Walk { id: number; tags: Record<string,string>; refs: number[] }
const walkWays: Walk[] = []              // named walking/cycling ways in bbox
const localWayIds = new Set<number>()    // any walk-type way touching bbox (for relations)
const namedWays: NamedThing[] = []       // named non-highway ways in bbox (missed-POI report)
const routeRels: Array<{ id: number; tags: Record<string,string>; memberWays: number[] }> = []

await pipeline(
  createReadStream(PBF_PATH),
  parseOSM() as any,
  new Transform({
    objectMode: true,
    transform(items: any[], _e, cb) {
      for (const it of items) {
        if (it.type === 'way') {
          const refs: number[] = it.refs ?? []
          const local = refs.some((r: number) => nodeCoord.has(r))
          if (!local) continue
          const tags = it.tags ?? {}
          if (WALK_HIGHWAYS.has(tags.highway)) {
            localWayIds.add(it.id)
            if (tags.name) walkWays.push({ id: it.id, tags, refs })
          } else if (tags.name) {
            const pt = refs.map((r: number) => nodeCoord.get(r)).find(Boolean)
            if (pt) namedWays.push({ id: it.id, kind: 'way', lat: pt[0], lng: pt[1], tags })
          }
        } else if (it.type === 'relation') {
          const tags = it.tags ?? {}
          if (tags.type === 'route' && ROUTE_TYPES.has(tags.route) && tags.name) {
            const memberWays = (it.members ?? []).filter((m: any) => m.type === 'way').map((m: any) => m.ref)
            if (memberWays.some((id: number) => localWayIds.has(id))) {
              routeRels.push({ id: it.id, tags, memberWays })
            }
          }
        }
      }
      cb()
    },
  }),
)
console.log(` ${walkWays.length} named walk segments, ${routeRels.length} local route relations, ${namedWays.length} other named ways`)

// ── Group walk segments by name, compute length ──────────────────────────────
const walks = new Map<string, { tags: Record<string,string>; km: number; segs: number; lat: number; lng: number }>()
for (const w of walkWays) {
  const coords = w.refs.map(r => nodeCoord.get(r)).filter(Boolean) as [number, number][]
  if (coords.length < 2) continue
  let km = 0
  for (let i = 1; i < coords.length; i++) km += dist(coords[i-1][0], coords[i-1][1], coords[i][0], coords[i][1])
  const key = w.tags.name
  const cur = walks.get(key)
  if (cur) {
    cur.km += km; cur.segs++
    for (const k of ['sac_scale','surface','trail_visibility','wheelchair','dog','foot','bicycle','horse','width','incline']) {
      if (!cur.tags[k] && w.tags[k]) cur.tags[k] = w.tags[k]
    }
  } else {
    const mid = coords[Math.floor(coords.length / 2)]
    walks.set(key, { tags: { ...w.tags }, km, segs: 1, lat: mid[0], lng: mid[1] })
  }
}

console.log(`\n═══ NAMED WALKS & TRAILS (${walks.size}) — currently ALL invisible to the app ═══`)
const sorted = [...walks.entries()].sort((a, b) => b[1].km - a[1].km)
for (const [name, w] of sorted) {
  const t = w.tags
  const bits = [
    `${w.km.toFixed(1)}km`,
    t.sac_scale && `sac:${t.sac_scale}`,
    t.surface && `surface:${t.surface}`,
    t.wheelchair && `♿:${t.wheelchair}`,
    t.dog && `dog:${t.dog}`,
    t.bicycle && `bike:${t.bicycle}`,
    t.highway,
  ].filter(Boolean).join(' · ')
  console.log(`  ${name}  [${bits}]`)
}

console.log(`\n═══ ROUTE RELATIONS (${routeRels.length}) — currently invisible ═══`)
for (const r of routeRels) {
  const t = r.tags
  console.log(`  ${t.name}  [${t.route}${t.distance ? ' · ' + t.distance : ''}${t.network ? ' · ' + t.network : ''} · ${r.memberWays.length} segments]`)
}

// ── Missed-tag report on named POIs in bbox ──────────────────────────────────
const all = [...namedNodes, ...namedWays]
const wouldCapture = all.filter(p => Object.keys(p.tags).some(k => CURRENT_KEYS.has(k)))
const missed = all.filter(p => !Object.keys(p.tags).some(k => CURRENT_KEYS.has(k)) && !WALK_HIGHWAYS.has(p.tags.highway) && !p.tags.highway)

const tagTally = new Map<string, number>()
const usefulOnCaptured = new Map<string, number>()
const USEFUL = ['wheelchair','opening_hours:kitchen','fee','toilets','drinking_water','ele','man_made','place','sport','charge','access','dog']
for (const p of missed) {
  const primary = Object.keys(p.tags).find(k => !['name','source','created_by'].includes(k) && !k.startsWith('addr:') && !k.startsWith('name:'))
  if (primary) tagTally.set(`${primary}=${p.tags[primary]}`, (tagTally.get(`${primary}=${p.tags[primary]}`) ?? 0) + 1)
}
for (const p of wouldCapture) {
  for (const k of USEFUL) if (p.tags[k]) usefulOnCaptured.set(k, (usefulOnCaptured.get(k) ?? 0) + 1)
}

console.log(`\n═══ NAMED POIs IN AREA: ${all.length} · pipeline captures candidates from ${wouldCapture.length} · fully invisible ${missed.length} ═══`)
console.log(`\nTop primary tags on invisible named POIs:`)
for (const [tag, n] of [...tagTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
  console.log(`  ${String(n).padStart(4)} × ${tag}`)
}
console.log(`\nUseful tags present on POIs we DO capture but currently throw away:`)
for (const [k, n] of [...usefulOnCaptured.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)} × ${k}`)
}

// Sample invisible named POIs that look tourist-relevant
console.log(`\nSample of invisible POIs (with any of: man_made, place, sport, ford, mountain_pass):`)
for (const p of missed.filter(p => p.tags.man_made || p.tags.place || p.tags.sport || p.tags.mountain_pass).slice(0, 20)) {
  const primary = ['man_made','place','sport','mountain_pass'].map(k => p.tags[k] ? `${k}=${p.tags[k]}` : null).filter(Boolean).join(',')
  console.log(`  ${p.tags.name}  [${primary}]`)
}
