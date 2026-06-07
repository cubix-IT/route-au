# Roadmap

## Phase 1 — Foundation ✅
- 130 Victorian destinations with enriched data
- Wikipedia-first enrichment (Geofabrik PBF + Claude Haiku)
- Landing page: watercolour hero, destination grid, seasonal scoring
- Trip wizard + results (desktop panel + mobile bottom sheet)
- Fuel prices (Service Vic API), weather (MET Norway), VicEmergency hazard map pins
- PWA (manual service worker — vite-plugin-pwa replaced due to Vite 8 compat)
- Rebrand: RouteAU → Unplanned Escapes

## Phase 1.5 — Polish ✅
- [x] Hero redesign: search-first, trust signal, radial vignette for text clarity
- [x] UI consistency: unified chip/tab spec (radius 20, green active, 2px border)
- [x] M3 animations: card hover lift, tab fade, wizard step transition
- [x] M3 Expressive wizard: tonal surface, 28dp corners, linear progress bar, pill CTA
- [x] Generating screen: Victorian landscape SVG animation (4WD + hills + clouds)
- [x] Card expand/collapse: only one card open at a time
- [x] Local/nearby split in results (≤20 min local, >20 min Also nearby, min 5 shown)
- [x] Distance from town centre on activity cards
- [x] Food tab: Cellar Doors / Places to Eat / Pubs + cuisine tag on card
- [x] VicEmergency hazard icons on map (fire 🔥 flood 💧 weather ⛈️)
- [x] Wizard stays open until Supabase data ready — no loading screen on results
- [x] Step counter "Step X of Y" + wizard fixed height throughout
- [x] Static trails: Brisbane Ranges, Kinglake, Dandenong, Macedon, Plenty Gorge
- [x] Maps URLs: coord-pin for natural features
- [x] Wikipedia destination summaries skip disaster/population sentences
- [x] Libraries filtered from results
- [x] Privacy page: static CDN file (/privacy), instant load
- [x] Status page: branded HTML, always renders, 5min CDN cache
- [x] Shared brand constants (src/lib/brand.ts), radius tokens, colour tokens
- [x] Scrollbar hidden on horizontal chip rows (mobile)
- [x] Sub-destination tabs on cluster cards match unified chip spec

## Phase 1.6 — Mobile UX + M3 Polish ✅ (2026-06-07)
- [x] Removed wikiSummary "About" section everywhere (was showing unreliable content)
- [x] Mobile landing: overview tiles replace About — Things to Do + Food & Drinks (M3 2-col tonal card grid) + Stay row + slim weather bar
- [x] Category tiles tap → filtered activity list with ‹ Back to overview
- [x] Wizard date strip: 3 days/page on mobile, weather emoji + max°/min° per day, compact card height
- [x] Loading screen: centred M3 layout, wave shimmer linear progress bar
- [x] useWeather hook: added hourly forecast data (temperature, weathercode, precip probability)
- [x] Desktop: wikiSummary removed from ThingsTile, TripSummaryPanel, ItineraryPanel

## Phase 2 — Auth + Domain (next)
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
- Medium-effort M3 items: radius token sweep across wizard, food grid layout
