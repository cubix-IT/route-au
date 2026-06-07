# CLAUDE.md

Victorian weekend getaway discovery app. Live at unplanned-escapes.vercel.app.
Working directory: `/home/raj/unplanned-escapes`

## Commands

```bash
npm run dev          # dev server → localhost:5173
npm run build        # type check + production build
npm run deploy       # build + deploy to Vercel prod + log to Supabase deploy_log
npm run enrich       # enrich 8 stale destinations from Geofabrik PBF (local)
npm run enrich -- --all --force   # re-enrich all 130 destinations
npm run enrich -- --slug healesville  # single destination
```

**Never use `vercel --prod` directly** — bypasses the `deploy_log` table in Supabase.

## 🚫 NON-NEGOTIABLE RULES

- **NO raw coordinate URLs in Maps links — ever.** `https://maps.google.com/?q=-37.8,145.2` is FORBIDDEN.
  - Natural features (waterfalls, lookouts, parks): `https://maps.google.com/maps?q=LAT,LNG+(Name)`
  - Businesses/venues: `https://www.google.com/maps/search/?api=1&query=Name%2C+Dest&ll=LAT,LNG`
  - Use the `mapsUrl()` helper in `scripts/enrich.ts` and `coordMapsUrl()` in `ExperiencePanel.tsx`
  - After every enrichment run, verify zero coord-only URLs in DB

- **NO paid APIs without Raj explicitly approving** — Google Places caused A$1,992 bill May 2026.

- **Never use `vercel --prod` directly** — bypasses the `deploy_log` table.

- **Issue lifecycle** — In Progress → work → UAT → Raj signoff → Deploy → Close. Never close before deploy.

## ⚠️ Vercel Config Requirements
- **Node.js version must be 22.x** (set in Vercel dashboard → Build & Deployment)
- Node 24 causes rolldown to fail with `UNLOADABLE_DEPENDENCY` on `src/data/` files
- vite-plugin-pwa is disabled on Vercel builds (rolldown compat issue) — stubbed in `vite.config.ts`

## Architecture

**Data flow:**
```
User wizard → Zustand store (useAppStore) → usePlannerData hook
  → Supabase (activities / food_places / nature_spots / accommodation)  ← primary
  → Overpass API (live OSM fallback if Supabase empty)                  ← fallback
  → ExperiencePanel (desktop ≥768px) / MobilePlanner (mobile)
```

**Key files:**
- `src/store/useAppStore.ts` — Zustand store, persisted to localStorage `unplanned-escapes-v4`. Scalar selectors only: `(s) => s.x`
- `src/hooks/usePlannerData.ts` — main data hook; `openActivities`, `uniqueNature`, `dbFood`, `accommodationPOIs` — **must stay memoized** (unmemoized arrays → infinite re-render, React error #185)
- `src/components/wizard/ProfileWizard.tsx` → `src/hooks/useItineraryBuilder.ts`
- `src/components/planner/ExperiencePanel.tsx` — desktop result (tabs: Explore / Food & Drinks / Stay / Trails / Fuel)
- `src/components/planner/MobilePlanner.tsx` — mobile result (tabs: Explore / Food & Drinks / Stay / Plan / Fuel)
- `scripts/enrich.ts` — local enrichment script using Geofabrik PBF (replaces old Vercel cron)
- `src/App.tsx` — `AppErrorBoundary` wraps everything; on crash clears localStorage and redirects home
- `vercel.json` — 2 cron jobs (fuel + summaries), route rewrites

**Serverless API routes** (`api/`): 12 functions max on Vercel Hobby.

**State persistence:** `activeItinerary` intentionally NOT persisted to localStorage (too large → QuotaExceededError).

## Critical Rules

- **NO PAID APIs without Raj explicitly approving** — Google Places caused A$1,992 bill May 2026. Ask first, implement after "yes". No exceptions.
- **Only approved paid service:** Anthropic Claude Haiku in enrichment script (~$0.003/destination). Raj's account is prepaid, no auto-reload.
- **DB `source` column** — always `'static'` (CHECK constraint)
- **Activities `category`** — must be one of: `nature wildlife history art family active relaxation markets viewpoint beach wellness entertainment sports shopping food drink`
- **Slug conventions:** OSM → `osm-<type>-<id>`, VHD heritage → `vhd-<id>`
- **Maps URLs** — labeled format only: `https://maps.google.com/maps?q=LAT,LNG+(Name)` — raw coord URLs (`?q=LAT,LNG` without label or `/maps` path) are FORBIDDEN

## Enrichment (Geofabrik — replaces Overpass)

Overpass removed 2026-06-06. All enrichment uses Geofabrik Victoria PBF.

**Run locally:** `npm run enrich` (supports `--all`, `--force`, `--slug`, `--limit`, `--no-push`)

**PBF file:** `data/victoria-latest.osm.pbf` (~224MB, gitignored, re-downloaded if >1 day old)

**GitHub Actions:** `.github/workflows/enrich.yml` — weekly Sunday 2am AEST when laptop is off.
Requires GitHub repo secrets: `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`

**Quality gates:**
- Activities: description required (>20 chars) — Wikipedia always overrides short OSM descriptions
- Cafes/bakeries: Wikipedia tag required (notable places only)
- Hotels/motels/resorts: filtered OUT of activities (live in `accommodation` table)
- Animal enclosure labels (Dingo1, Koala etc.): filtered out
- `natural=peak` → `active` category (hiking, not viewpoint)
- Historic people/places (Ned Kelly, bushranger, capture) → `history`
- Food-named attractions (cheese factory, dairy) → `food`
- Delete-before-insert per destination (clean slate, no stale records)

**Run log:** `logs/enrich-runs.jsonl` — appended and committed to GitHub after each run.

## Cron Jobs (2 on Vercel Hobby)

| Job | Schedule (UTC) | AEST | Does |
|---|---|---|---|
| fuel | `0 18 * * *` | 4am | Service Vic fuel prices |
| summaries | `0 16 * * 0` | Sunday 2am | AI summaries + trails refresh (1st of month) |

## Data Sources (all free)

| Source | Used for |
|---|---|
| Geofabrik (OSM PBF) | All POI enrichment — no rate limits |
| VHD API (`api.heritagecouncil.vic.gov.au`) | Heritage buildings |
| Wikipedia REST | Descriptions + quality scores |
| MET Norway (`api.met.no`) | Weather forecasts |
| Photon (Komoot) | Location autocomplete |
| OSRM | Route geometry |
| Service Victoria Fuel | Fuel prices (`SERVICE_VIC_FUEL_KEY` env) |
| VicEmergency | Hazard alerts |

## Database

Supabase free tier, Sydney region, 500MB limit (~13MB used).
Migrations in `supabase/migrations/` — run manually in Supabase SQL Editor in order.
Migration 006 (`006_auth_profiles_trips.sql`) written but **not yet run** (auth not enabled).
RLS enabled on all tables. Public read, service_role write only.

## UI Tabs

**ExperiencePanel (desktop) and MobilePlanner (mobile) both have:**
- 🗺 **Explore / Things to Do** — activities + nature, category filter chips
- 🍽 **Food & Drinks** — drink venues first (Winery/Brewery/Distillery), then food; category filter chips
- 🏨 **Stay** — accommodation with address, website or Google search fallback (no Booking.com)
- 🥾 **Trails** — Great Trails Victoria (proximity 0.5° / ~55km)
- ⛽ **Fuel** — Service Vic fuel stops on route

Map pins update per active tab.

## Current Phase

Phase 2 — Auth + Domain. Auth code written, awaiting Supabase dashboard setup (Google OAuth + migration 006). Custom domain `unplannedescapes.com.au` pending.

## P1 Next Session
1. Region search in wizard (Yarra Valley, Grampians etc.)
2. Trigger summaries cron — 111/130 destinations missing summaries
3. Missing banner images on some destinations
4. Mobile: map on top, panel slides up when filter selected
5. VicEmergency fire/hazard icons on map
6. Read `/home/raj/Downloads/Ines Unplanned Escapes.docx` — UX feedback (desktop view)
