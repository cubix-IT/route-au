import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// Get all activities by sub_dest + category
const { data: acts } = await sb.from('activities').select('sub_dest_id, category')
// Get all food_places by sub_dest + category
const { data: food } = await sb.from('food_places').select('sub_dest_id, category')
// Get all sub_destinations for slug mapping
const { data: subs } = await sb.from('sub_destinations').select('sub_dest_id, slug, name')

// Build slug map
const slugMap: Record<number, {slug:string,name:string}> = {}
for (const s of subs ?? []) slugMap[s.sub_dest_id] = { slug: s.slug, name: s.name }

// Count categories per sub_dest_id
const counts: Record<number, Record<string, number>> = {}
const addRow = (sub_dest_id: number, category: string) => {
  if (!counts[sub_dest_id]) counts[sub_dest_id] = {}
  counts[sub_dest_id][category] = (counts[sub_dest_id][category] || 0) + 1
}
for (const r of acts ?? []) addRow(r.sub_dest_id, r.category)
for (const r of food ?? []) addRow(r.sub_dest_id, r.category)

// Print distinct categories across all tables
const allCats = new Set([...(acts ?? []).map(r => r.category), ...(food ?? []).map(r => r.category)])
console.log('=== ALL CATEGORIES ===')
for (const c of [...allCats].sort()) console.log(' ', c)

// Print top 3 themes per sub_dest
console.log('\n=== TOP THEMES PER DESTINATION ===')
for (const [id, cats] of Object.entries(counts)) {
  const info = slugMap[Number(id)]
  if (!info) continue
  const top3 = Object.entries(cats).sort((a,b) => b[1]-a[1]).slice(0,3)
  const themes = top3.map(([cat, n]) => `${cat}(${n})`).join(', ')
  console.log(`${info.slug.padEnd(32)} ${themes}`)
}
