# Unplanned Escapes — Session Plan
Last updated: 2026-06-01

---

## ⚠️ PERMANENT RULE — NO GOOGLE API, NO PAID APIS

Google Places API caused A$1,992 in charges during May 2026.
ALL Google API code, keys, and data permanently removed on 2026-06-01.

**NEVER add any paid API. This is a hobby project. All services must be free.**

Current free stack: Overpass API (OSM) + Wikipedia + Supabase + Vercel Hobby + Open-Meteo + OSRM + Photon + CartoDB

---

## Architecture

The app pre-fetches all POI data via Overpass (OSM) into Supabase. Frontend reads from Supabase only.

**APIs that stay real-time** (can't be pre-cached):
- Open-Meteo — weather (free, no key)
- OSRM — road route geometry (free, no key)
- Photon — geocoding (free, no key)
- VicEmergency — live hazard alerts (free)

**Everything else from Supabase DB:**

| Source | Table(s) | Cron | Schedule |
|---|---|---|---|
| Overpass API (OpenStreetMap) | activities, food_places, nature_spots, accommodation | enrich-places | Daily 6am AEST |
| Service Victoria Fuel API | fuel_stations, fuel_prices | fuel-prices | Daily 3am AEST |
| Wikipedia + Claude | destination_summaries | enrich-summaries | Weekly Sunday 2am AEST |

**Supabase project:** `tofpkcjrrefuzzfqojjj.supabase.co`

---

## Enrichment — Overpass API (FREE ONLY)

`api/cron/enrich.ts` — runs daily at 6am AEST (cron: `0 19 * * *`)
- 1 Overpass query per destination (15km radius, all POI types combined)
- 5 destinations per run → all 139 cycle every ~28 days
- Wikipedia fetched for top attraction description (1 call per destination)
- Hard stops built in — cron kills itself if limits approached

**Usage limits monitored:**
| Service | Safe limit | Stop condition |
|---|---|---|
| Overpass API | 9,000/day | HTTP 429 or 2x timeout in a row |
| Wikipedia | 200/min | HTTP 429 → skip destination |
| Supabase DB | 450MB | 500MB free limit |
| Vercel | 1M/mo | Currently ~460/mo (0.05%) |

**Check live usage:** `GET /api/status`

---

## Database Schema (Supabase — free tier, 500MB limit)

Tables:
- `clusters` — 22 Victorian travel regions
- `sub_destinations` — 139 specific towns/areas (FK to clusters)
- `activities` — things to do (Overpass OSM source, `osm-` slug prefix)
- `food_places` — cafes, pubs, restaurants, wineries (Overpass OSM)
- `nature_spots` — hikes, beaches, viewpoints, national parks (Overpass OSM)
- `accommodation` — hotels, campsites, caravan parks (Overpass OSM)
- `fuel_stations` — Service Victoria station data
- `fuel_prices` — prices per fuel type per station
- `destination_summaries` — Wikipedia + Claude AI summary per destination
- `cron_log` — per-run log (every job writes here with usage stats in notes JSON)
- `deployment_log` — plan name, start/complete timestamps, git sha
- `changelog` — all releases + backlog

**Current row counts (2026-06-01):**
| Table | Rows | Source |
|---|---|---|
| activities | ~5–140 | Overpass OSM (growing daily) |
| food_places | ~259–1,400 | Overpass OSM (growing daily) |
| nature_spots | ~349 | Overpass OSM |
| accommodation | ~5,665 | Overpass OSM |
| sub_destinations | 139 | Static |

**Note:** All Google Places `gp-` rows deleted 2026-06-01. OSM enrichment cron running daily.

**Column naming:** `{table_singular}_id` for PKs — e.g. `sub_dest_id`, `activity_id`

RLS: Public read all content tables. Service-role write only.

---

## Cron Jobs

### `/api/cron/enrich.ts` — Daily OSM enrichment (6am AEST)
- Overpass API: 1 combined query per destination, 15km radius
- Wikipedia: 1 call per destination for description (350ms sleep between calls)
- Upserts to activities, food_places, nature_spots tables
- Unique conflict key: `slug` (format: `osm-{type}-{osm_id}`)
- Hard stops: Overpass daily limit, DB size guard, timeout guard
- Logs to cron_log with full usage JSON in notes field

### `/api/cron/fuel.ts` — Daily fuel prices (3am AEST)
- Service Victoria Fair Fuel API → fuel_stations + fuel_prices
- 1,740 stations, ~3,361 prices

### `/api/cron/summaries.ts` — Weekly AI summaries (Sunday 2am AEST)
- Wikipedia text + Claude Haiku → destination_summaries
- 10 destinations per run

---

## File Map (key files)

```
route-au/
├── api/
│   ├── _lib/supabase.ts        ← adminSupabase client (service role key)
│   ├── cron/
│   │   ├── enrich.ts           ← Overpass + Wikipedia enrichment (FREE)
│   │   ├── fuel.ts             ← Service Victoria fuel prices
│   │   └── summaries.ts        ← Wikipedia + Claude summaries
│   ├── status.ts               ← GET /api/status — usage dashboard
│   ├── places.ts               ← Returns empty array (Google removed)
│   ├── fuel.ts                 ← Fuel prices from Supabase
│   ├── hazards.ts              ← VicEmergency proxy (real-time, free)
│   └── destination-summary.ts  ← Claude AI summary endpoint
├── src/
│   ├── lib/
│   │   ├── overpass.ts         ← Overpass queries (client-side, for live POIs)
│   │   └── supabase.ts         ← VITE_SUPABASE_URL + anon key client
│   ├── hooks/
│   │   ├── usePlannerData.ts   ← reads DB: activities, food, nature, fuel
│   │   └── useActivities.ts    ← static curated activities only
│   ├── components/
│   │   ├── landing/
│   │   │   ├── LandingPage.tsx         ← Hero search, cluster cards
│   │   │   └── DestinationModal.tsx    ← "What's here" — Supabase activities+food+nature
│   │   ├── planner/
│   │   │   ├── ExperiencePanel.tsx     ← Desktop result: Things to Do / Eat / Food on Route
│   │   │   └── MobilePlanner.tsx       ← Mobile result page (Material You)
│   │   └── map/MapContainer.tsx
│   ├── data/
│   │   └── victorianActivities.ts      ← Types only (no static data)
│   └── store/
│       ├── useAppStore.ts
│       └── db.ts                       ← IndexedDB client cache
├── vercel.json                 ← Cron + function maxDuration config
└── SESSION_PLAN.md             ← THIS FILE
```

---

## Design Rules (do not violate)

- **NO PAID APIS. EVER.** (Google, Foursquare, Mapbox paid, etc.)
- NO emojis in UI chrome (buttons, headers, labels, badges)
- Professional tone — knowledgeable travel advisor, not a kids app
- Activity category markers (small icons) are OK
- "Local favourite" not "hidden gem"
- No "return home" in itinerary
- Zustand selectors: always scalar `(s) => s.x` — never object `(s) => ({ x: s.x })` (causes infinite re-renders)

---

## How to Resume a Session

1. Read this file
2. `git log --oneline -10` — see latest commits
3. `npm run dev` — localhost at http://localhost:5174
4. `curl https://unplanned-escapes.vercel.app/api/status` — check all usage limits
5. `vercel --prod` — deploy to production

---

## Current State (2026-06-01)

### What happened this session:
- **Google Places API billing emergency** — A$1,992 charged in May 2026
- All Google Places API code permanently removed (9691e21, 039437a)
- All gp- database rows deleted (4,223 records across 4 tables)
- Rebuilt enrichment on Overpass API (OSM) — completely free
- Added /api/status monitoring endpoint for all service limits
- Google billing dispute report generated: /home/raj/google_api_removal_report.pdf

### Current enrichment status:
- OSM enrichment cron running daily at 6am AEST
- ~5–10 destinations enriched so far with OSM data
- Remaining 130+ destinations will be enriched over next ~28 days by cron
- Manual trigger: `curl -X POST https://unplanned-escapes.vercel.app/api/cron/enrich?force=1&limit=5`

---

## Next Session Priorities

1. **Improve OSM data quality** — add Wikipedia cross-reference as quality signal; some activities may be sparse for very remote areas
2. **Business listing feature** — allow businesses to claim/enhance listing for small fee (future Stripe integration)
3. **Paywall** — decide free vs paid features; Stripe not yet installed
4. **Domain launch** — unplannedescapes.com.au → Cloudflare (free plan only) → Vercel
5. **User auth** — Supabase Auth (already in stack)
6. **Events system** — festivals, markets, Sunday-only events
7. **Dynamic drive times** from user's actual origin
8. **PWA update toast**
9. **Update Privacy/Attribution page** — remove Google Places reference, add OpenStreetMap/ODbL attribution
