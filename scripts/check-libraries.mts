import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const { data: acts } = await sb.from('activities').select('name, category, sub_dest_id').ilike('name', '%library%').order('name')
console.log('Libraries in activities:')
acts?.forEach((r: any) => console.log(`  [${r.category}] ${r.name} (${r.sub_dest_id})`))
const { data: nat } = await sb.from('nature_spots').select('name, sub_dest_id').ilike('name', '%library%')
console.log('\nLibraries in nature_spots:')
nat?.forEach((r: any) => console.log(`  ${r.name} (${r.sub_dest_id})`))
