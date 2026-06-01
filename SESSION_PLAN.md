# Unplanned Escapes — Session Plan
Last updated: 2026-06-01

---

## ⚠️ PERMANENT RULE — NO GOOGLE API, NO PAID APIS

Google Places API caused A$1,992 in charges during May 2026. ALL Google API
code, keys, and data permanently removed 2026-06-01. Billing dispute filed.

**NEVER add any paid API. This is a hobby project. All services must be free.**

Free stack: Overpass API (OSM) · Wikipedia · Supabase · Vercel Hobby ·
Open-Meteo · OSRM · Photon · CartoDB

---

## Free Data Top-Up (formerly "enrichment" — renamed to avoid trauma 😄)

### Cron: `0 1 * * *` (UTC) = 11am AEST daily

**Why 11am AEST?**
Overpass servers are in Germany. The busy time is European daytime (8am–10pm CET).
- ❌ Old schedule: `0 17 * * *` UTC = 3am AEST = **7pm Germany** — peak load
- ✅ New schedule: `0 1 * * *` UTC = 11am AEST = **3am Germany** — lowest load

At 3am German time, Overpass is almost idle. Queries complete in 1-2s instead of timing out.

### Behaviour
- **8 destinations per run** (safe: 8 × ~7s = ~56s, Vercel limit 60s)
- **3s pause between destinations** — prevents 429 burst rate limiting
- All 139 destinations cycle every ~17 days
- Hard stops: 9,000 Overpass calls/day · DB >450MB · HTTP 429 · 2x timeout
- source field: **must be 'static'** (DB constraint) — OSM origin in attributes.source

### Manual trigger (when Overpass is working)
```
curl -X POST "https://unplanned-escapes.vercel.app/api/cron/enrich?force=1&limit=8"
```

### Check usage
```
curl https://unplanned-escapes.vercel.app/api/status
```

---

## Architecture

All pre-fetchable data → Supabase DB populated by cron. Frontend reads Supabase only.

**Real-time APIs (can't pre-cache):**
- Open-Meteo — weather (free, no key)
- OSRM — route geometry (free, no key)
- Photon — geocoding (free, no key)
- VicEmergency — live hazard alerts (free)

**Supabase tables:**
| Table | Rows | Source | Notes |
|---|---|---|---|
| activities | 17 | static + manual | 8 Daylesford curated manually, 9 other curated |
| food_places | 372 | Overpass OSM | chains filtered out |
| nature_spots | 79 | Overpass OSM | survey parcels filtered |
| accommodation | 5,665 | Overpass OSM | hidden from wizard pending review |
| sub_destinations | 139 | static | |
| clusters | 22 | static | |
| destination_summaries | ? | Wikipedia + Claude | weekly Sunday 2am |
| fuel_stations | 1,740 | Service Victoria | |
| fuel_prices | 3,361 | Service Victoria | |

---

## OSM Classification Logic (api/cron/enrich.ts)

### What goes where
- **activities**: tourism=attraction/museum/gallery/viewpoint, natural=hot_spring/spring,
  railway=station, historic=*, waterway=lake/reservoir, leisure=park/garden,
  amenity=marketplace/theatre/cinema/spa
- **food_places**: amenity=cafe/restaurant/pub/bar/bakery/winery/biergarten,
  shop=bakery/coffee, craft=brewery/cider/winery/distillery, tourism=winery
- **nature_spots**: natural=peak/beach/waterfall/cliff, leisure=nature_reserve,
  boundary=national_park

### Quality filters
- **Food**: must have website OR phone OR opening_hours. Chain blacklist: McDonald's,
  KFC, Subway, Hungry Jack's, Red Rooster, Oporto, Grill'd, Domino's etc.
- **Nature**: must have contact info OR visitor-destination name (falls, lake, gorge,
  national park etc). Survey parcels excluded (letter+number codes like "I85").
- **Activities**: all named OSM places in target categories qualify (no rating needed)

### Activity categories
| Category | Emoji | Trigger |
|---|---|---|
| viewpoint | 🌄 | lookout, viewpoint, peak, summit |
| nature | 🌿 | lake, waterfall, garden, botanic, forest, reserve |
| beach | 🏖️ | beach, coast |
| wellness | ♨️ | hot spring, mineral spring, bathhouse, spa |
| history | 🏛️ | railway station, historic, museum, heritage, ruins |
| art | 🎨 | gallery, art centre |
| markets | 🛒 | market, sunday market, farmers market |
| wildlife | 🦘 | wildlife, sanctuary, zoo, koala |
| active | 🧗 | adventure, zipline, treetop, walking track, golf |
| relaxation | 🧖 | spa, wellness retreat |
| entertainment | 🎵 | stadium, theatre, cinema |
| winery | 🍷 | winery, cellar door, vineyard |
| brewery | 🍺 | brewery, brewpub |
| distillery | 🥃 | distillery, gin, whisky |

---

## Cron Schedule Summary

| Cron | UTC | AEST | Purpose |
|---|---|---|---|
| `0 1 * * *` | 1:00am | 11:00am | Overpass top-up (Overpass at 3am Germany = quietest) |
| `0 17 * * *` | 5:00pm | 3:00am | Fuel prices (Service Victoria) |
| `0 16 * * 0` | 4:00pm Sun | 2:00am Mon | Destination summaries (Wikipedia + Claude) |

---

## Data Licences (must attribute in UI)
- **OpenStreetMap**: ODbL — "© OpenStreetMap contributors" in footer (**TODO**)
- **Wikipedia**: CC-BY-SA 4.0 — attribution in footer (**TODO**)
- **Wikidata**: CC0 — no attribution required

---

## File Map

```
route-au/
├── api/
│   ├── _lib/supabase.ts          ← adminSupabase client (service role)
│   ├── cron/
│   │   ├── enrich.ts             ← Overpass + Wikipedia top-up (FREE)
│   │   ├── fuel.ts               ← Service Victoria fuel prices
│   │   └── summaries.ts          ← Wikipedia + Claude summaries
│   ├── status.ts                 ← GET /api/status — live usage dashboard
│   ├── places.ts                 ← Returns empty (Google removed)
│   ├── fuel.ts                   ← Fuel prices from Supabase
│   ├── hazards.ts                ← VicEmergency (real-time, free)
│   └── destination-summary.ts   ← Claude AI summary endpoint
├── src/
│   ├── lib/overpass.ts           ← Client-side Overpass (live POIs fallback)
│   ├── hooks/
│   │   ├── usePlannerData.ts     ← DB: activities, food, nature, fuel
│   │   └── useActivities.ts      ← Static curated activities only
│   ├── components/
│   │   ├── landing/
│   │   │   ├── LandingPage.tsx
│   │   │   └── DestinationModal.tsx  ← "What's here" — queries all 3 tables
│   │   ├── planner/
│   │   │   ├── ExperiencePanel.tsx   ← Desktop result page
│   │   │   └── MobilePlanner.tsx     ← Mobile result page
│   │   └── wizard/ProfileWizard.tsx  ← Accommodation step HIDDEN
│   └── store/useAppStore.ts
├── vercel.json                   ← Cron schedule + function timeouts
└── SESSION_PLAN.md               ← THIS FILE
```

---

## Design Rules

- **NO PAID APIS. EVER.** (see billing incident May 2026)
- NO emojis in UI chrome (buttons, headers, labels, badges)
- Professional tone — knowledgeable travel advisor, not a kids app
- "Local favourite" not "hidden gem"
- No "return home" in itinerary
- Zustand: always scalar selectors `(s) => s.x` — never `(s) => ({ x: s.x })`
- Maps links: use Google Maps name-search (free for users to open, no API call)
- DB source field: must be 'static' — OSM origin tracked in attributes.source JSON

---

## How to Resume a Session

```bash
git log --oneline -10          # latest commits
npm run dev                    # localhost:5174
curl https://unplanned-escapes.vercel.app/api/status   # check usage
vercel --prod                  # deploy
```

---

## Current State (2026-06-01 end of session)

### What was done today
- **DISASTER RECOVERY**: Google Places API caused A$1,992 bill — all removed
- All Google code deleted, DB cleaned (4,223 gp- rows deleted)
- Rebuilt on Overpass API (free forever)
- Added `/api/status` usage monitoring dashboard
- Fixed source constraint bug (`'osm'` → `'static'`)
- Fixed activity categories: winery/brewery/distillery own categories
- Filtered chain restaurants (49 deleted), survey parcel noise (654 deleted)
- Manually inserted 8 Daylesford activities (Sunday Market, Railway, Lake,
  Mineral Springs, Wombat Hill, Convent Gallery, Bathhouse, Lake Walk)
- Cron rescheduled to 11am AEST = 3am Germany (Overpass off-peak)
- Accommodation hidden from wizard pending data
- Google billing dispute report: /home/raj/google_api_removal_report.pdf

### Known issues / next session
1. **Add OSM + Wikipedia attribution to footer** (legally required by ODbL + CC-BY-SA)
2. **Re-enable accommodation wizard step** when data is confirmed good
3. **Activities still sparse** for most destinations — 3am top-up will fill over ~17 days
4. **Inner Melbourne suburbs** (Carlton, Brunswick, CBD etc.) skipped — too dense for Overpass,
   need tighter radius or different approach
5. **Business listing feature** — allow venues to claim/enhance listing (future Stripe)
6. **Domain** — unplannedescapes.com.au → Cloudflare free → Vercel
7. **OSM contributions** — add "Edit on OSM" link on activity/food cards so users can fix bad data; improvements feed back into next enrichment cycle (P3)
