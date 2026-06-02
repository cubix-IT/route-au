# Architecture

## What it is
Victorian weekend getaway discovery app. Users describe their trip style via a short wizard; the app returns personalised destination recommendations with curated activities, food, nature spots, and heritage sites.

## Stack (100% free tier)
| Layer | Tool |
|---|---|
| Frontend | Vite + React + TypeScript + Tailwind v4 |
| State | Zustand (persisted to localStorage `unplanned-escapes-v4`) |
| Map | MapLibre GL JS + CartoDB Positron tiles |
| Database | Supabase free (Sydney region) — 500MB limit |
| Hosting | Vercel Hobby |
| Offline cache | IndexedDB (`unplanned-escapes-db` v4) via `idb` |

## Data flow
```
User wizard → Zustand store → usePlannerData hook
  → Supabase (activities / food_places / nature_spots)
  → Falls back to live Overpass API if Supabase empty
  → ExperiencePanel (desktop) / MobilePlanner (mobile)
```

## Key files
- `src/components/landing/LandingPage.tsx` — landing page + destination grid
- `src/components/landing/DestinationModal.tsx` — "What's here" modal per destination
- `src/components/wizard/ProfileWizard.tsx` — trip preference wizard
- `src/components/planner/ExperiencePanel.tsx` — desktop results (Things to Do / Eat & Drink)
- `src/components/planner/MobilePlanner.tsx` — mobile results
- `src/hooks/usePlannerData.ts` — reads Supabase, Overpass fallback
- `src/store/useAppStore.ts` — global Zustand store
- `src/store/db.ts` — IndexedDB helpers
- `api/cron/enrich.ts` — daily enrichment cron (Overpass + VHD + Wikipedia)

## Design rules
- No paid APIs ever (Google Places caused A$1,992 bill May 2026 — see `api/privacy.ts`)
- No emojis in UI chrome
- "Local favourite" not "hidden gem"
- Zustand: scalar selectors only `(s) => s.x`
- DB `source` column: always `'static'` (enforced by CHECK constraint)

## Deploy
```bash
npm run deploy   # ALWAYS use this — logs to deploy_log table in Supabase
# Never: vercel --prod directly
```
