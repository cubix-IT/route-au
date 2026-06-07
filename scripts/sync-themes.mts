/**
 * Sync sub-destination themes from actual DB category counts.
 * Primary = most common category, Secondary = 2nd, Tertiary = 3rd.
 * Maps DB categories → INTEREST_THEMES vocabulary so scoring stays accurate.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// DB category → theme string(s) that match INTEREST_THEMES vocab
const CAT_MAP: Record<string, string[]> = {
  // Activities table
  nature:        ['Nature'],
  history:       ['History'],
  viewpoint:     ['Viewpoint'],
  active:        ['Active'],
  wildlife:      ['Wildlife'],
  art:           ['Art'],
  wellness:      ['Wellness'],
  entertainment: ['Entertainment'],
  beach:         ['Coastal'],
  markets:       ['Markets'],
  drink:         ['Drink'],
  relaxation:    ['Wellness'],
  // Food places table
  Winery:        ['Winery'],
  Brewery:       ['Brewery'],
  Pub:           ['Pub'],
  Distillery:    ['Distillery'],
  Cafe:          ['Cafes'],
  Restaurant:    ['Dining'],
  Bakery:        ['Bakeries'],
}

const { data: acts } = await sb.from('activities').select('sub_dest_id, category')
const { data: food } = await sb.from('food_places').select('sub_dest_id, category')
const { data: subs } = await sb.from('sub_destinations').select('sub_dest_id, slug')

const slugMap: Record<number, string> = {}
for (const s of subs ?? []) slugMap[s.sub_dest_id] = s.slug

// Count categories per slug
const counts: Record<string, Record<string, number>> = {}
const addRow = (id: number, cat: string) => {
  const slug = slugMap[id]
  if (!slug) return
  if (!counts[slug]) counts[slug] = {}
  counts[slug][cat] = (counts[slug][cat] || 0) + 1
}
for (const r of acts ?? []) addRow(r.sub_dest_id, r.category)
for (const r of food ?? []) addRow(r.sub_dest_id, r.category)

// Build top-3 themes per slug
const themesBySlug: Record<string, string[]> = {}
for (const [slug, cats] of Object.entries(counts)) {
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1])
  const themes: string[] = []
  const seen = new Set<string>()
  for (const [cat] of sorted) {
    const mapped = CAT_MAP[cat] ?? [cat.charAt(0).toUpperCase() + cat.slice(1)]
    for (const t of mapped) {
      if (!seen.has(t) && themes.length < 3) { themes.push(t); seen.add(t) }
    }
    if (themes.length >= 3) break
  }
  themesBySlug[slug] = themes
}

// Patch victorianClusters.ts
const filePath = 'src/data/victorianClusters.ts'
let src = readFileSync(filePath, 'utf8')

let updated = 0
for (const [slug, themes] of Object.entries(themesBySlug)) {
  if (themes.length === 0) continue
  // Match the sub-dest block: id: 'slug' ... themes: [...] 
  // We replace themes line that appears after the id line
  const themeStr = `themes: [${themes.map(t => `'${t}'`).join(', ')}],`
  // Find the id: 'slug' then replace the NEXT themes: [...] line
  const idPattern = new RegExp(
    `(id: '${slug.replace(/-/g, '\\-')}'[\\s\\S]*?\\n[ \\t]+)themes: \\[[^\\]]*\\],`
  )
  if (idPattern.test(src)) {
    src = src.replace(idPattern, `$1${themeStr}`)
    updated++
    console.log(`✓ ${slug.padEnd(36)} → [${themes.join(', ')}]`)
  } else {
    console.log(`⚠ no match for ${slug}`)
  }
}

writeFileSync(filePath, src)
console.log(`\nUpdated ${updated} sub-destinations.`)
