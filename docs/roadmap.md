# Roadmap

## Phase 1 — Foundation ✅
- 130 Victorian destinations with enriched data
- Wikipedia-first enrichment (Geofabrik PBF + Claude Haiku)
- Landing page: watercolour hero, destination grid, seasonal scoring
- Trip wizard + results (desktop panel + mobile bottom sheet)
- Fuel prices (Service Vic API), weather (MET Norway), VicEmergency hazard map pins
- PWA (manual service worker — vite-plugin-pwa replaced due to Vite 8 compat)
- Rebrand: RouteAU → Unplanned Escapes

## Phase 1.5 — Polish (current) ✅
- [x] Hero redesign: search-first, trust signal, radial vignette for text clarity
- [x] UI consistency: unified chip/tab spec, green highlight colours, shadow tokens
- [x] M3 animations: card hover lift, tab fade, wizard step transition
- [x] Card expand/collapse: only one card open at a time
- [x] Local/nearby split in results (≤20 min = local, >20 min = Also nearby)
- [x] Distance from town centre on activity cards
- [x] Food tab: Cellar Doors / Places to Eat / Pubs + cuisine tag
- [x] VicEmergency hazard icons on map (fire 🔥 flood 💧 weather ⛈️)
- [x] Wizard stays open until data loads — no loading screen on results
- [x] Step counter "Step X of Y" in wizard header
- [x] Static trails for Brisbane Ranges, Kinglake, Dandenong, Macedon, Plenty Gorge
- [x] Maps URLs: coord-pin for natural features (not named search)
- [x] Wikipedia summaries skip disaster/population sentences
- [x] Libraries filtered from results (not weekend destinations)

## Phase 2 — Auth + Domain
- [ ] **Run migration 006 in Supabase SQL Editor** (`supabase/migrations/006_auth_profiles_trips.sql`)
- [ ] **Enable Google OAuth in Supabase Dashboard**
- [ ] **Set Site URL + redirect URLs in Supabase Auth config**
- [ ] Custom domain: `unplannedescapes.com.au` → Cloudflare → Vercel
- [ ] Marketing push / SEO

## Phase 3 — Paywall
- Stripe integration — Explorer plan ~$29/yr
- Explorer perks: saved trips, GPX export, trip journal, PDF export
- Stripe webhook verification
- Supabase RLS on trip data

## Backlog
- Rate limiting on `/api/*` Vercel functions
- CSP headers in `vercel.json`
- Parks & conservation reserves map layer
- OSM attribution in MapLibre canvas (legal requirement)
