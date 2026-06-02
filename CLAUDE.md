# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Victorian weekend getaway discovery app. Live at unplanned-escapes.vercel.app.
Working directory: `/home/raj/unplanned-escapes`

## Commands

```bash
npm run dev          # dev server → localhost:5174
npm run build        # production build + type check
npm run deploy       # build + deploy to Vercel prod + log to Supabase deploy_log
npx tsc --noEmit     # type check only (run before every commit)
```

**Never use `vercel --prod` directly** — bypasses the `deploy_log` table in Supabase.

## Architecture

**Data flow:**
```
User wizard → Zustand store (useAppStore) → usePlannerData hook
  → Supabase (activities / food_places / nature_spots)   ← primary
  → Overpass API (live OSM fallback if Supabase empty)   ← fallback
  → ExperiencePanel (desktop ≥768px) / MobilePlanner (mobile)
```

**Key files:**
- `src/store/useAppStore.ts` — single Zustand store, persisted to localStorage `unplanned-escapes-v4`. Scalar selectors only: `(s) => s.x`
- `src/hooks/usePlannerData.ts` — main data hook; returns memoized `openActivities`, `uniqueNature`, `accommodationPOIs` — **must stay memoized** (unmemoized arrays cause infinite re-render loop, React error #185)
- `src/components/wizard/ProfileWizard.tsx` → `src/hooks/useItineraryBuilder.ts` — wizard completion builds and sets `activeItinerary` in Zustand
- `api/cron/enrich.ts` — daily Vercel cron; fetches Overpass + VHD + Wikipedia per destination, upserts to Supabase
- `src/App.tsx` — `AppErrorBoundary` wraps everything; on crash clears localStorage and redirects home
- `vercel.json` — cron schedules, route rewrites (`/privacy` → `api/privacy`, `/changelog` → `api/changelog`), function timeouts

**Serverless API routes** (`api/`): 12 functions max on Vercel Hobby. Currently at limit — removing one is required before adding any new function.

**State persistence:** `activeItinerary` is intentionally NOT persisted to localStorage (too large, caused 7MB bloat + QuotaExceededError). It is rebuilt each wizard run.

## Critical Rules

- **NO PAID APIs without Raj explicitly approving** — Google Places caused A$1,992 bill May 2026. Ask first, implement after "yes". No exceptions, even if cheap.
- **Only approved paid service:** Anthropic Claude Haiku in enrichment cron (~$0.003/day). Raj's account is prepaid with no auto-reload.
- **DB `source` column** — always `'static'` (CHECK constraint; `'osm'` and `'google'` will fail)
- **Activities `category`** — must be one of: `nature wildlife history art family active relaxation markets viewpoint beach wellness entertainment sports shopping food drink`
- **Slug conventions:** OSM → `osm-<type>-<id>`, VHD heritage → `vhd-<id>`

## Data Sources (all free + commercially licensed)

| Source | Used for | Limit |
|---|---|---|
| Overpass (OSM) | Activities, food, nature | Hard stop at 9,000/day |
| VHD API (`api.heritagecouncil.vic.gov.au`) | Heritage buildings | No auth, no limit |
| MET Norway (`api.met.no`) | Weather forecasts | Fair use, CC licence |
| Wikipedia REST | Descriptions + quality scores | 350ms sleep between calls |
| Photon (Komoot) | Location autocomplete | No limit |
| OSRM | Route geometry | No limit |
| Service Victoria Fuel | Fuel prices | Key in `SERVICE_VIC_FUEL_KEY` env |
| VicEmergency | Hazard alerts | No auth |

Full details: `@docs/data-sources.md`

## Database

Supabase free tier, Sydney region, 500MB limit (~13MB used).
Migrations live in `supabase/migrations/` — run manually in Supabase SQL Editor in order.
Migration 006 (`006_auth_profiles_trips.sql`) written but **not yet run** in dashboard.
RLS enabled on all tables. Public read, service_role write only.

Full schema + constraints: `@docs/database.md`

## Enrichment Cron

Runs daily at 11am AEST, 8 destinations/batch, cycles all 139 destinations every ~17 days.
Hard stops: 9k Overpass calls/day · 450MB DB · HTTP 429 · 2× timeout.
Manual trigger: `curl -X POST "https://unplanned-escapes.vercel.app/api/cron/enrich?force=1&limit=8"`

Full details: `@docs/enrichment-cron.md`

## Current Phase

Phase 2 — Auth + Domain. Auth code written, awaiting Supabase dashboard setup (Google OAuth + migration 006). Custom domain `unplannedescapes.com.au` pending.

Roadmap: `@docs/roadmap.md`
