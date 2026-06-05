/**
 * Quick test: download Victoria PBF from Geofabrik and parse a sample of nodes.
 * Run: npx tsx scripts/test-geofabrik.ts
 */

import { createWriteStream, createReadStream, existsSync, statSync } from 'fs'
import { Transform } from 'stream'
import { pipeline } from 'stream/promises'
import parseOSM from 'osm-pbf-parser'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PBF_PATH = path.resolve(__dirname, '../data/victoria-latest.osm.pbf')
const PBF_URL  = 'https://download.geofabrik.de/australia-oceania/australia/victoria-latest.osm.pbf'
const MAX_AGE_MS = 24 * 60 * 60 * 1000

// ── Download if missing or stale ──────────────────────────────────────────────
async function ensurePbf() {
  if (existsSync(PBF_PATH)) {
    const age = Date.now() - statSync(PBF_PATH).mtimeMs
    if (age < MAX_AGE_MS) {
      const sizeMB = (statSync(PBF_PATH).size / 1024 / 1024).toFixed(1)
      console.log(`Using cached PBF (${sizeMB} MB, ${Math.round(age / 60000)} min old)`)
      return
    }
    console.log('PBF is stale (>1 day), re-downloading...')
  } else {
    console.log('Downloading Victoria PBF from Geofabrik...')
  }

  const res = await fetch(PBF_URL)
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`)

  const total = parseInt(res.headers.get('content-length') ?? '0')
  let received = 0, lastPct = -1

  const writer = createWriteStream(PBF_PATH)
  const reader = res.body!.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.length
    writer.write(value)
    if (total) {
      const pct = Math.floor(received / total * 100)
      if (pct !== lastPct && pct % 10 === 0) {
        process.stdout.write(`  ${pct}% (${(received / 1024 / 1024).toFixed(1)} MB)\n`)
        lastPct = pct
      }
    }
  }
  await new Promise<void>((res, rej) => writer.end(err => err ? rej(err) : res()))
  console.log(`Downloaded: ${(statSync(PBF_PATH).size / 1024 / 1024).toFixed(1)} MB`)
}

// ── Parse: count tagged POIs ──────────────────────────────────────────────────
const RELEVANT = new Set(['tourism','natural','amenity','shop','craft','leisure','historic','waterway','railway'])

function hasRelevantTag(tags: Record<string,string>): boolean {
  return Object.keys(tags).some(k => RELEVANT.has(k))
}

async function parseSample() {
  console.log('\nParsing PBF...')
  let nodes = 0, ways = 0, relations = 0, taggedNodes = 0, taggedWays = 0
  const samples: any[] = []

  const counter = new Transform({
    objectMode: true,
    transform(items: any[], _enc, cb) {
      for (const item of items) {
        if (item.type === 'node') {
          nodes++
          if (item.tags?.name && hasRelevantTag(item.tags)) {
            taggedNodes++
            if (samples.length < 5) samples.push(item)
          }
        } else if (item.type === 'way') {
          ways++
          if (item.tags?.name && hasRelevantTag(item.tags)) taggedWays++
        } else if (item.type === 'relation') {
          relations++
        }
      }
      cb()
    },
  })

  await pipeline(createReadStream(PBF_PATH), parseOSM() as any, counter)

  console.log(`\nResults:`)
  console.log(`  Nodes:     ${nodes.toLocaleString()} total, ${taggedNodes.toLocaleString()} named+tagged`)
  console.log(`  Ways:      ${ways.toLocaleString()} total, ${taggedWays.toLocaleString()} named+tagged`)
  console.log(`  Relations: ${relations.toLocaleString()}`)
  console.log('\nSample nodes:')
  for (const s of samples) {
    const keys = Object.keys(s.tags).filter(k => RELEVANT.has(k)).join(', ')
    console.log(`  ${s.tags.name} — ${keys} (${s.lat?.toFixed(4)}, ${s.lon?.toFixed(4)})`)
  }
}

async function main() {
  await ensurePbf()
  await parseSample()
}

main().catch(err => { console.error(err); process.exit(1) })
